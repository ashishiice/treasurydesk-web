# Signing keys

`desk-dev.jks` is a **development** key (store/key password `thedesk-dev`, alias `thedesk`).
It is committed so every CI build has the same signature — new APKs install over old ones
and player progress (stored in the app's WebView) is kept.

Because this repository is public, anyone could sign an APK with this key. For wider
distribution, create a private key and add it as repository secrets:

| Secret | Value |
|---|---|
| `DESK_KEYSTORE_B64` | `base64 -w0 release.jks` |
| `DESK_KEYSTORE_PASSWORD` | keystore password (also used as key password) |
| `DESK_KEY_ALIAS` | key alias |

The workflow uses the secret key automatically when present. Switching keys requires a
one-time uninstall/reinstall (export progress codes first from Settings → Progress backup).
