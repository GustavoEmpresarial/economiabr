function normalizeSecret(value) {
  return String(value || "").trim().replace(/^['\"]+|['\"]+$/g, "");
}

function getProvidedSecret(req) {
  const fromHeader = req.headers["x-api-secret"];
  if (fromHeader) {
    return normalizeSecret(fromHeader);
  }

  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return normalizeSecret(authHeader.slice(7));
  }

  return "";
}

function requireSecret(req, res, next) {
  const expected = normalizeSecret(process.env.API_SECRET);
  const provided = getProvidedSecret(req);

  if (!expected) {
    return res.status(500).json({ error: "API_SECRET nao configurado no servidor" });
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Nao autorizado" });
  }

  return next();
}

module.exports = {
  requireSecret,
};
