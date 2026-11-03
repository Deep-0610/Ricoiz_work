export function tenantGuard(req, res, next) {
  const clientId = req.user?.clientId;
  if (!clientId) {
    return res.status(403).json({ success: false, error: "Workspace access is required" });
  }
  req.tenantId = String(clientId);
  return next();
}
