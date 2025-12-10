def authenticate_user(username, password):
    # TEMPORARY — will replace with Vault lookup
    return username == "admin" and password == "admin123"

