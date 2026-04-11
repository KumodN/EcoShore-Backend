const stripWrappingQuotes = (value = '') => {
  const text = String(value).trim();

  if (!text) {
    return '';
  }

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }

  return text;
};

const normalizePrivateKey = (value = '') => {
  return stripWrappingQuotes(value).replace(/\\n/g, '\n');
};

const env = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return '';
};

const parseServiceAccountFromJsonEnv = () => {
  const raw = env('FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_JSON');

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  } catch {
    return null;
  }
};

const serviceAccountFromJson = parseServiceAccountFromJsonEnv();

const FIREBASE_CONFIG =
  serviceAccountFromJson ||
  {
    type: 'service_account',
    project_id: env('FIREBASE_PROJECT_ID', 'PROJECT_ID'),
    private_key_id: env('FIREBASE_PRIVATE_KEY_ID', 'PRIVATE_KEY_ID'),
    private_key: normalizePrivateKey(env('FIREBASE_PRIVATE_KEY', 'PRIVATE_KEY')),
    client_email: env('FIREBASE_CLIENT_EMAIL', 'CLIENT_EMAIL'),
    client_id: env('FIREBASE_CLIENT_ID', 'CLIENT_ID'),
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: env(
      'FIREBASE_CLIENT_X509_CERT_URL',
      'CLIENT_X509_CERT_URL'
    ),
    universe_domain: 'googleapis.com',
  };

module.exports = FIREBASE_CONFIG;
