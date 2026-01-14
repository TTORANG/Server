export function success(res, result = null, status = 200) {
  return res.status(status).json({
    resultType: "SUCCESS",
    error: null,
    result,
  });
}
