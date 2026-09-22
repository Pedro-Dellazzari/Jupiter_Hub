use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "spaces_description",
            sql: include_str!("../migrations/002_spaces_description.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "tasks_space",
            sql: include_str!("../migrations/003_tasks_space.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "notebooks_parent",
            sql: include_str!("../migrations/004_notebooks_parent.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "sync_readiness",
            sql: include_str!("../migrations/005_sync_readiness.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "sync_state",
            sql: include_str!("../migrations/006_sync_state.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "milestones",
            sql: include_str!("../migrations/007_milestones.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hub.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
