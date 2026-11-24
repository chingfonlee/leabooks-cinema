package com.leabook.cinema;

import android.content.Context;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Loopback-only (127.0.0.1) HTTP 1.1 Range streaming server for Android SAF content:// URIs
 * and legacy File paths (Android 8 Oreo fallback when DocumentsUI is absent).
 */
public class LocalVideoHttpServer {

    public static class VideoTarget {
        public final Uri uri;
        public final File file;
        public final String mimeType;
        public final long size;

        public VideoTarget(Uri uri, File file, String mimeType, long size) {
            this.uri = uri;
            this.file = file;
            this.mimeType = mimeType;
            this.size = size;
        }
    }

    private final Context appContext;
    private final String sessionToken = UUID.randomUUID().toString().replace("-", "");
    private final Map<String, VideoTarget> registry = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private ServerSocket serverSocket;
    private volatile boolean running = false;
    private int port = 0;

    public LocalVideoHttpServer(Context context) {
        this.appContext = context.getApplicationContext();
    }

    public synchronized void ensureStarted() throws IOException {
        if (running && serverSocket != null && !serverSocket.isClosed()) {
            return;
        }
        InetAddress loopback = InetAddress.getByName("127.0.0.1");
        serverSocket = new ServerSocket(0, 16, loopback);
        port = serverSocket.getLocalPort();
        running = true;

        executor.execute(() -> {
            while (running) {
                try {
                    Socket client = serverSocket.accept();
                    executor.execute(() -> handleClient(client));
                } catch (IOException e) {
                    if (!running) break;
                }
            }
        });
    }

    public void clearRegistry() {
        registry.clear();
    }

    public String registerVideo(String id, Uri uri, String mimeType, long size) {
        registry.put(id, new VideoTarget(uri, null, mimeType, size));
        return "http://127.0.0.1:" + port + "/video/" + id + "?token=" + sessionToken;
    }

    public String registerVideoFile(String id, File file, String mimeType, long size) {
        registry.put(id, new VideoTarget(null, file, mimeType, size));
        return "http://127.0.0.1:" + port + "/video/" + id + "?token=" + sessionToken;
    }

    public synchronized void stop() {
        running = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {}
            serverSocket = null;
        }
    }

    private void handleClient(Socket socket) {
        try (Socket s = socket;
             BufferedReader reader = new BufferedReader(
                 new InputStreamReader(s.getInputStream(), StandardCharsets.US_ASCII)
             );
             OutputStream out = s.getOutputStream()) {

            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;
            String method = parts[0];
            String fullPath = parts[1];

            String rangeHeader = null;
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String name = line.substring(0, colon).trim().toLowerCase();
                    if ("range".equals(name)) {
                        rangeHeader = line.substring(colon + 1).trim();
                    }
                }
            }

            if ("OPTIONS".equalsIgnoreCase(method)) {
                writeSimpleResponse(out, "204 No Content", "");
                return;
            }

            if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
                writeSimpleResponse(out, "405 Method Not Allowed", "Method Not Allowed");
                return;
            }

            int qIdx = fullPath.indexOf('?');
            String pathOnly = qIdx >= 0 ? fullPath.substring(0, qIdx) : fullPath;
            String query = qIdx >= 0 ? fullPath.substring(qIdx + 1) : "";

            if (!query.contains("token=" + sessionToken) || !pathOnly.startsWith("/video/")) {
                writeSimpleResponse(out, "403 Forbidden", "Forbidden");
                return;
            }

            String id = pathOnly.substring("/video/".length());
            VideoTarget target = registry.get(id);
            if (target == null) {
                writeSimpleResponse(out, "404 Not Found", "Not Found");
                return;
            }

            if (target.file != null) {
                streamFromFile(target, method, rangeHeader, out);
            } else {
                streamFromContentUri(target, method, rangeHeader, out);
            }
        } catch (IOException ignored) {
            // Client closed connection early (normal during video seeking)
        }
    }

    private void streamFromFile(
        VideoTarget target,
        String method,
        String rangeHeader,
        OutputStream out
    ) throws IOException {
        if (!target.file.exists() || !target.file.canRead()) {
            writeSimpleResponse(out, "404 Not Found", "Cannot open video file");
            return;
        }
        long totalLength = target.file.length();
        try (FileInputStream fis = new FileInputStream(target.file)) {
            streamInputStream(fis, totalLength, target.mimeType, method, rangeHeader, out);
        }
    }

    private void streamFromContentUri(
        VideoTarget target,
        String method,
        String rangeHeader,
        OutputStream out
    ) throws IOException {
        try (ParcelFileDescriptor pfd =
                 appContext.getContentResolver().openFileDescriptor(target.uri, "r")) {
            if (pfd == null) {
                writeSimpleResponse(out, "404 Not Found", "Cannot open video");
                return;
            }
            long totalLength = target.size > 0 ? target.size : pfd.getStatSize();
            try (FileInputStream fis = new FileInputStream(pfd.getFileDescriptor())) {
                streamInputStream(fis, totalLength, target.mimeType, method, rangeHeader, out);
            }
        }
    }

    private void streamInputStream(
        FileInputStream fis,
        long totalLength,
        String mimeType,
        String method,
        String rangeHeader,
        OutputStream out
    ) throws IOException {
        if (totalLength <= 0) {
            writeSimpleResponse(out, "500 Internal Server Error", "Unknown file size");
            return;
        }

        long start = 0;
        long end = totalLength - 1;
        boolean isPartial = false;

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String spec = rangeHeader.substring("bytes=".length()).split(",")[0].trim();
            int dash = spec.indexOf('-');
            if (dash >= 0) {
                String startStr = spec.substring(0, dash).trim();
                String endStr = spec.substring(dash + 1).trim();
                try {
                    if (!startStr.isEmpty()) {
                        start = Long.parseLong(startStr);
                        if (!endStr.isEmpty()) {
                            end = Long.parseLong(endStr);
                        }
                    } else if (!endStr.isEmpty()) {
                        long suffix = Long.parseLong(endStr);
                        start = Math.max(0, totalLength - suffix);
                    }
                    if (start < 0 || start >= totalLength || end < start) {
                        writeSimpleResponse(out, "416 Range Not Satisfiable", "Invalid range");
                        return;
                    }
                    if (end >= totalLength) {
                        end = totalLength - 1;
                    }
                    isPartial = true;
                } catch (NumberFormatException ignored) {}
            }
        }

        long contentLength = end - start + 1;
        StringBuilder headers = new StringBuilder();
        headers.append(isPartial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
        headers.append("Content-Type: ").append(mimeType).append("\r\n");
        headers.append("Accept-Ranges: bytes\r\n");
        headers.append("Content-Length: ").append(contentLength).append("\r\n");
        if (isPartial) {
            headers.append("Content-Range: bytes ")
                   .append(start).append("-").append(end)
                   .append("/").append(totalLength).append("\r\n");
        }
        headers.append("Access-Control-Allow-Origin: *\r\n");
        headers.append("Connection: close\r\n\r\n");

        out.write(headers.toString().getBytes(StandardCharsets.US_ASCII));
        if ("HEAD".equalsIgnoreCase(method)) {
            out.flush();
            return;
        }

        if (start > 0) {
            fis.getChannel().position(start);
        }
        byte[] buffer = new byte[64 * 1024];
        long remaining = contentLength;
        while (remaining > 0) {
            int toRead = (int) Math.min(buffer.length, remaining);
            int read = fis.read(buffer, 0, toRead);
            if (read == -1) break;
            out.write(buffer, 0, read);
            remaining -= read;
        }
        out.flush();
    }

    private void writeSimpleResponse(OutputStream out, String status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        String resp = "HTTP/1.1 " + status + "\r\n"
            + "Content-Type: text/plain; charset=utf-8\r\n"
            + "Content-Length: " + bytes.length + "\r\n"
            + "Access-Control-Allow-Origin: *\r\n"
            + "Connection: close\r\n\r\n";
        out.write(resp.getBytes(StandardCharsets.US_ASCII));
        if (bytes.length > 0) out.write(bytes);
        out.flush();
    }
}
