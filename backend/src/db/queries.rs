use sqlx::PgPool;
use crate::db::models::User;

pub async fn get_users(pool: &PgPool) -> Vec<User> {
    sqlx::query_as!(User, "SELECT * FROM users")
        .fetch_all(pool)
        .await
        .expect("Failed to fetch users")
}