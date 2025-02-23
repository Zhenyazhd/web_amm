/*use axum::{response::Html, extract::State};
use sqlx::PgPool;

pub async fn dashboard_page(State(pool): State<PgPool>) -> Html<String> {
    let result = sqlx::query!("SELECT COUNT(*) AS total_users FROM users")
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch user count");

    let response = format!("<h1>Dashboard</h1><p>Total users: {}</p>", result.total_users.unwrap_or(0));
    Html(response)
}*/
use axum::response::Html;

pub async fn dashboard_page() -> Html<&'static str> {
    Html("<h1>Dashboard</h1><p>Here you will see contract details.</p>")
}