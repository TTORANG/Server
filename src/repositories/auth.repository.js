import { pool } from "../db.config.js";

// 이메일로 유저 찾기
export const findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT id, email, name FROM user WHERE email = ?", [email]);
  return rows[0];
};

// ID로 유저 찾기 (JWT 검증용)
export const findUserById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]);
  return rows[0];
};

// 신규 소셜 유저 생성
export const createSocialUser = async (email, name, provider, providerId) => {
  const [result] = await pool.query(
    "INSERT INTO user (email, name, oauth_provider, oauth_id, role) VALUES (?, ?, ?, ?, ?)",
    [email, name, provider, providerId, "user"]
  );
  return result.insertId;
};
