use axum::{Router, extract::Json, routing::post};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    email: String,
    password: String,
}