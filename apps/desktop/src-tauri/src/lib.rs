use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle();

            let menu = Menu::with_items(
                handle,
                &[
                    &Submenu::with_id_and_items(
                        handle,
                        "app-menu",
                        "Superscript",
                        true,
                        &[
                            &PredefinedMenuItem::about(handle, None, None)?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::services(handle, None)?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::hide(handle, None)?,
                            &PredefinedMenuItem::hide_others(handle, None)?,
                            &PredefinedMenuItem::show_all(handle, None)?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::quit(handle, None)?,
                        ],
                    )?,
                    &Submenu::with_id_and_items(
                        handle,
                        "edit-menu",
                        "Edit",
                        true,
                        &[
                            &PredefinedMenuItem::undo(handle, None)?,
                            &PredefinedMenuItem::redo(handle, None)?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::cut(handle, None)?,
                            &PredefinedMenuItem::copy(handle, None)?,
                            &PredefinedMenuItem::paste(handle, None)?,
                            &PredefinedMenuItem::select_all(handle, None)?,
                        ],
                    )?,
                    &Submenu::with_id_and_items(
                        handle,
                        "format-menu",
                        "Format",
                        true,
                        &[
                            &Submenu::with_id_and_items(
                                handle,
                                "font-menu",
                                "Font",
                                true,
                                &[
                                    &MenuItem::with_id(
                                        handle,
                                        "font-default",
                                        "Default",
                                        true,
                                        None::<&str>,
                                    )?,
                                    &MenuItem::with_id(
                                        handle,
                                        "font-baskerville",
                                        "Classical",
                                        true,
                                        None::<&str>,
                                    )?,
                                    &MenuItem::with_id(
                                        handle,
                                        "font-mono",
                                        "Modern",
                                        true,
                                        None::<&str>,
                                    )?,
                                ],
                            )?,
                            &PredefinedMenuItem::separator(handle)?,
                            &Submenu::with_id_and_items(
                                handle,
                                "size-menu",
                                "Size",
                                true,
                                &[
                                    &MenuItem::with_id(
                                        handle,
                                        "size-small",
                                        "Small",
                                        true,
                                        None::<&str>,
                                    )?,
                                    &MenuItem::with_id(
                                        handle,
                                        "size-medium",
                                        "Default",
                                        true,
                                        None::<&str>,
                                    )?,
                                    &MenuItem::with_id(
                                        handle,
                                        "size-large",
                                        "Large",
                                        true,
                                        None::<&str>,
                                    )?,
                                ],
                            )?,
                        ],
                    )?,
                    &Submenu::with_id_and_items(
                        handle,
                        "window-menu",
                        "Window",
                        true,
                        &[
                            &PredefinedMenuItem::minimize(handle, None)?,
                            &PredefinedMenuItem::maximize(handle, None)?,
                            &PredefinedMenuItem::close_window(handle, None)?,
                        ],
                    )?,
                ],
            )?;

            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                let payload = match event.id().as_ref() {
                    "font-default" => Some(("font_change", "default")),
                    "font-baskerville" => Some(("font_change", "classical")),
                    "font-mono" => Some(("font_change", "modern")),
                    "size-small" => Some(("size_change", "small")),
                    "size-medium" => Some(("size_change", "default")),
                    "size-large" => Some(("size_change", "large")),
                    _ => None,
                };
                if let Some((event_name, value)) = payload {
                    app.emit(event_name, value).ok();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
