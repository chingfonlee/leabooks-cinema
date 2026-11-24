package com.leabook.cinema;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "LocalVideoLibrary",
    permissions = {
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE }
        )
    }
)
public class LocalVideoLibraryPlugin extends Plugin {

    private static final String PREFS_NAME = "lea_book_tv_video_prefs";
    private static final String KEY_TREE_URI = "video_tree_uri";
    private static final String KEY_LEGACY_MODE = "video_legacy_mode";

    private LocalVideoHttpServer httpServer;

    @Override
    public void load() {
        super.load();
        httpServer = new LocalVideoHttpServer(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        if (httpServer != null) {
            httpServer.stop();
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getSavedFolder(PluginCall call) {
        Uri treeUri = loadSavedTreeUri();
        JSObject ret = new JSObject();
        if (treeUri != null) {
            DocumentFile dir = DocumentFile.fromTreeUri(getContext(), treeUri);
            boolean valid = dir != null && dir.exists() && dir.canRead();
            ret.put("hasFolder", valid);
            ret.put("folderName", valid && dir.getName() != null ? dir.getName() : "");
            call.resolve(ret);
            return;
        }
        if (isLegacyModeSaved()) {
            File legacyDir = resolveLegacyDirectory();
            boolean valid = legacyDir != null && legacyDir.exists() && legacyDir.canRead();
            ret.put("hasFolder", valid);
            ret.put("folderName", valid ? "Movies/" + legacyDir.getName() : "");
            call.resolve(ret);
            return;
        }
        ret.put("hasFolder", false);
        ret.put("folderName", "");
        call.resolve(ret);
    }

    @PluginMethod
    public void pickVideoFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        try {
            startActivityForResult(call, intent, "handleFolderPicked");
        } catch (ActivityNotFoundException e) {
            // Fallback for stripped Android 8-10 TV ROMs without DocumentsUI
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
                requestLegacyStorageAndList(call);
            } else {
                call.reject("No folder picker available on this device");
            }
        }
    }

    private void requestLegacyStorageAndList(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            setLegacyModeSaved(true);
            resolveLegacyVideoList(call);
        } else {
            requestPermissionForAlias("storage", call, "handleLegacyStoragePermission");
        }
    }

    @PermissionCallback
    private void handleLegacyStoragePermission(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            setLegacyModeSaved(true);
            resolveLegacyVideoList(call);
        } else {
            call.reject("Storage permission denied");
        }
    }

    @ActivityCallback
    private void handleFolderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("User cancelled folder selection");
            return;
        }

        Uri treeUri = result.getData().getData();
        if (treeUri == null) {
            call.reject("No folder URI returned");
            return;
        }

        try {
            getContext()
                .getContentResolver()
                .takePersistableUriPermission(treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException ignored) {
            // Some OEM document providers still allow read without explicit persist flag
        }

        saveTreeUri(treeUri);
        setLegacyModeSaved(false);
        resolveVideoList(call, treeUri);
    }

    @PluginMethod
    public void listVideos(PluginCall call) {
        Uri treeUri = loadSavedTreeUri();
        if (treeUri != null) {
            resolveVideoList(call, treeUri);
            return;
        }
        if (isLegacyModeSaved() && getPermissionState("storage") == PermissionState.GRANTED) {
            resolveLegacyVideoList(call);
            return;
        }
        JSObject ret = new JSObject();
        ret.put("hasFolder", false);
        ret.put("folderName", "");
        ret.put("videos", new JSArray());
        call.resolve(ret);
    }

    private void resolveLegacyVideoList(PluginCall call) {
        File dir = resolveLegacyDirectory();
        if (dir == null || !dir.exists() || !dir.canRead()) {
            JSObject ret = new JSObject();
            ret.put("hasFolder", false);
            ret.put("folderName", "Movies/LeaBookVideos");
            ret.put("videos", new JSArray());
            call.resolve(ret);
            return;
        }

        try {
            httpServer.ensureStarted();
        } catch (IOException e) {
            call.reject("Failed to start local video server: " + e.getMessage());
            return;
        }

        File[] children = dir.listFiles();
        List<File> videoFiles = new ArrayList<>();
        if (children != null) {
            for (File f : children) {
                if (f != null && f.isFile() && isSupportedVideoName(f.getName())) {
                    videoFiles.add(f);
                }
            }
        }
        videoFiles.sort(Comparator.comparing(f -> f.getName().toLowerCase(Locale.ROOT)));

        httpServer.clearRegistry();
        JSArray videosArray = new JSArray();
        int idx = 0;
        for (File file : videoFiles) {
            String id = "v" + (idx++);
            String name = file.getName();
            String mime = detectMimeType(name, null);
            long size = file.length();
            String playUrl = httpServer.registerVideoFile(id, file, mime, size);

            JSObject item = new JSObject();
            item.put("id", id);
            item.put("name", name);
            item.put("size", size);
            item.put("mimeType", mime);
            item.put("playUrl", playUrl);
            videosArray.put(item);
        }

        JSObject ret = new JSObject();
        ret.put("hasFolder", true);
        ret.put("folderName", "Movies/" + dir.getName());
        ret.put("videos", videosArray);
        call.resolve(ret);
    }

    private File resolveLegacyDirectory() {
        File movies = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
        if (movies == null) return null;
        File dedicated = new File(movies, "LeaBookVideos");
        if (dedicated.exists() && dedicated.isDirectory()) {
            return dedicated;
        }
        return movies;
    }

    private void resolveVideoList(PluginCall call, Uri treeUri) {
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), treeUri);
        if (dir == null || !dir.exists() || !dir.canRead()) {
            JSObject ret = new JSObject();
            ret.put("hasFolder", false);
            ret.put("folderName", "");
            ret.put("videos", new JSArray());
            call.resolve(ret);
            return;
        }

        try {
            httpServer.ensureStarted();
        } catch (IOException e) {
            call.reject("Failed to start local video server: " + e.getMessage());
            return;
        }

        DocumentFile[] children = dir.listFiles();
        List<DocumentFile> videoFiles = new ArrayList<>();
        for (DocumentFile f : children) {
            if (f != null && f.isFile() && isSupportedVideoName(f.getName())) {
                videoFiles.add(f);
            }
        }
        videoFiles.sort(Comparator.comparing(
            f -> f.getName() != null ? f.getName().toLowerCase(Locale.ROOT) : ""
        ));

        httpServer.clearRegistry();
        JSArray videosArray = new JSArray();
        int idx = 0;
        for (DocumentFile file : videoFiles) {
            String id = "v" + (idx++);
            String name = file.getName() != null ? file.getName() : ("video-" + idx + ".mp4");
            String mime = detectMimeType(name, file.getType());
            long size = file.length();
            String playUrl = httpServer.registerVideo(id, file.getUri(), mime, size);

            JSObject item = new JSObject();
            item.put("id", id);
            item.put("name", name);
            item.put("size", size);
            item.put("mimeType", mime);
            item.put("playUrl", playUrl);
            videosArray.put(item);
        }

        JSObject ret = new JSObject();
        ret.put("hasFolder", true);
        ret.put("folderName", dir.getName() != null ? dir.getName() : "本機影片資料夾");
        ret.put("videos", videosArray);
        call.resolve(ret);
    }

    private boolean isSupportedVideoName(String name) {
        if (name == null) return false;
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".mp4")
            || lower.endsWith(".webm")
            || lower.endsWith(".mkv")
            || lower.endsWith(".mov")
            || lower.endsWith(".m4v");
    }

    private String detectMimeType(String name, String providerType) {
        if (providerType != null && providerType.startsWith("video/")) {
            return providerType;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
        if (lower.endsWith(".mov")) return "video/quicktime";
        return "video/mp4";
    }

    private void saveTreeUri(Uri uri) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_TREE_URI, uri.toString()).apply();
    }

    private Uri loadSavedTreeUri() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_TREE_URI, null);
        return raw != null ? Uri.parse(raw) : null;
    }

    private void setLegacyModeSaved(boolean enabled) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_LEGACY_MODE, enabled).apply();
    }

    private boolean isLegacyModeSaved() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_LEGACY_MODE, false);
    }
}
