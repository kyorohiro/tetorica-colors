mod screen_capture;
use std::io::Cursor;
use tauri::ipc::Response;
use image::ImageFormat;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_screen_capture_permission,
            request_screen_capture_permission,
            open_privacy_settings,
            can_capture_foreign_window,
            capture_and_crop_bytes,
            probe_screen_capture_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn capture_and_crop_bytes(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<Response, String> {
    let capture_result = crate::screen_capture::capture_and_crop(x, y, width, height)?;

    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);

    capture_result
        .image
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(Response::new(buf))
}

#[cfg(target_os = "macos")]
use core_foundation::{
    array::{CFArrayGetCount, CFArrayGetValueAtIndex},
    base::TCFType,
    dictionary::{CFDictionaryGetValue, CFDictionaryRef},
    number::{kCFNumberSInt32Type, kCFNumberSInt64Type, CFNumberGetValue, CFNumberRef},
    string::CFString,
};

#[cfg(target_os = "macos")]
use core_graphics::{
    display::{
        kCGNullWindowID, kCGWindowListOptionIncludingWindow, kCGWindowListOptionOnScreenOnly,
        CGWindowListCopyWindowInfo,
    },
    geometry::CGRect,
};

#[cfg(target_os = "macos")]
use std::ffi::c_void;

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
    fn CGPreflightScreenCaptureAccess() -> bool;
    fn CGRequestScreenCaptureAccess() -> bool;

    fn CGWindowListCreateImage(
        screenBounds: CGRect,
        listOption: u32,
        windowID: u32,
        imageOption: u32,
    ) -> *const c_void;

    static CGRectNull: CGRect;
}

#[tauri::command]
fn check_screen_capture_permission() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        CGPreflightScreenCaptureAccess()
    }

    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

#[tauri::command]
fn request_screen_capture_permission() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        CGRequestScreenCaptureAccess()
    }

    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

#[tauri::command]
fn open_privacy_settings() {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
            .spawn();
    }
}

#[cfg(target_os = "macos")]
fn get_cf_number(dict: CFDictionaryRef, key: &str) -> Option<CFNumberRef> {
    let key_cf = CFString::new(key);
    let value =
        unsafe { CFDictionaryGetValue(dict, key_cf.as_concrete_TypeRef() as *const c_void) };

    if value.is_null() {
        None
    } else {
        Some(value as CFNumberRef)
    }
}

#[cfg(target_os = "macos")]
fn get_i32_from_dict(dict: CFDictionaryRef, key: &str) -> Option<i32> {
    let num = get_cf_number(dict, key)?;
    let mut value: i32 = 0;
    let ok = unsafe {
        CFNumberGetValue(
            num,
            kCFNumberSInt32Type,
            &mut value as *mut i32 as *mut c_void,
        )
    };
    if ok {
        Some(value)
    } else {
        None
    }
}

#[cfg(target_os = "macos")]
fn get_u32_from_dict(dict: CFDictionaryRef, key: &str) -> Option<u32> {
    let num = get_cf_number(dict, key)?;
    let mut value: i64 = 0;
    let ok = unsafe {
        CFNumberGetValue(
            num,
            kCFNumberSInt64Type,
            &mut value as *mut i64 as *mut c_void,
        )
    };
    if ok && value >= 0 && value <= u32::MAX as i64 {
        Some(value as u32)
    } else {
        None
    }
}

#[tauri::command]
fn can_capture_foreign_window() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        let self_pid = std::process::id() as i32;

        let window_list =
            CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID);

        if window_list.is_null() {
            return false;
        }

        let count = CFArrayGetCount(window_list);

        for i in 0..count {
            let dict = CFArrayGetValueAtIndex(window_list, i) as CFDictionaryRef;
            if dict.is_null() {
                continue;
            }

            let pid = get_i32_from_dict(dict, "kCGWindowOwnerPID");
            let window_id = get_u32_from_dict(dict, "kCGWindowNumber");
            let layer = get_i32_from_dict(dict, "kCGWindowLayer");

            if pid == Some(self_pid) {
                continue;
            }

            if layer != Some(0) {
                continue;
            }

            let Some(window_id) = window_id else {
                continue;
            };

            let img = unsafe {
                CGWindowListCreateImage(
                    CGRectNull,
                    kCGWindowListOptionIncludingWindow,
                    window_id,
                    0,
                )
            };

            if !img.is_null() {
                return true;
            }
        }

        false
    }

    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}


#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenCaptureProbeResult {
    status: String,
    checked_windows: usize,
}

#[tauri::command]
fn probe_screen_capture_permission() -> ScreenCaptureProbeResult {
    #[cfg(target_os = "macos")]
    unsafe {
        let self_pid = std::process::id() as i32;

        let window_list =
            CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID);

        if window_list.is_null() {
            return ScreenCaptureProbeResult {
                status: "indeterminate".to_string(),
                checked_windows: 0,
            };
        }

        let count = CFArrayGetCount(window_list);
        let mut checked_windows = 0usize;

        for i in 0..count {
            let dict = CFArrayGetValueAtIndex(window_list, i) as CFDictionaryRef;
            if dict.is_null() {
                continue;
            }

            let pid = get_i32_from_dict(dict, "kCGWindowOwnerPID");
            let window_id = get_u32_from_dict(dict, "kCGWindowNumber");
            let layer = get_i32_from_dict(dict, "kCGWindowLayer");

            if pid == Some(self_pid) {
                continue;
            }

            // 通常のアプリ window を優先
            if layer != Some(0) {
                continue;
            }

            let Some(window_id) = window_id else {
                continue;
            };

            checked_windows += 1;

            let img = CGWindowListCreateImage(
                CGRectNull,
                kCGWindowListOptionIncludingWindow,
                window_id,
                0,
            );

            if !img.is_null() {
                return ScreenCaptureProbeResult {
                    status: "granted".to_string(),
                    checked_windows,
                };
            }
        }

        if checked_windows == 0 {
            ScreenCaptureProbeResult {
                status: "indeterminate".to_string(),
                checked_windows: 0,
            }
        } else {
            ScreenCaptureProbeResult {
                status: "denied".to_string(),
                checked_windows,
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        ScreenCaptureProbeResult {
            status: "granted".to_string(),
            checked_windows: 0,
        }
    }
}
