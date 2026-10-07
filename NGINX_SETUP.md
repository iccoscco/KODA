# Guía de Configuración - Nginx Proxy Manager

## 📋 Pasos de Configuración

### 1. Acceder a Nginx Proxy Manager
```
URL: http://tu-servidor-ip:81
Usuario: admin@example.com
Contraseña: changeme
```

### 2. Cambiar credenciales por defecto
- Ir a Settings > Users
- Cambiar la contraseña del usuario admin

### 3. Crear Proxy Host para el Backend
1. Dashboard → Proxy Hosts → Add Proxy Host
2. **Details:**
   - Domain Names: `api.tu-dominio.com`
   - Scheme: `http`
   - Forward Hostname/IP: `backend`
   - Forward Port: `8080`
   - Block Common Exploits: ✅
3. **SSL:**
   - SSL Certificate: Request a new SSL Certificate
   - Email: tu-email@example.com
   - Force SSL: ✅
   - HTTP/2 Support: ✅
4. Click Save

### 4. Crear Proxy Host para el Frontend
1. Dashboard → Proxy Hosts → Add Proxy Host
2. **Details:**
   - Domain Names: `app.tu-dominio.com`
   - Scheme: `http`
   - Forward Hostname/IP: `frontend`
   - Forward Port: `3000`
   - Block Common Exploits: ✅
3. **SSL:**
   - SSL Certificate: Request a new SSL Certificate
   - Email: tu-email@example.com
   - Force SSL: ✅
   - HTTP/2 Support: ✅
4. Click Save

### 5. Configurar Redirección HTTP → HTTPS
- Para cada proxy host, en la pestaña "SSL" activar "Force SSL"

## 🔧 Configuración Avanzada (Opcional)

### Headers Custom (para CORS seguro)
En la sección "Custom Locations" del proxy host del backend:

```
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $server_name;
```

### Rate Limiting
- Ir a Access Lists → Add Access List
- Usar para proteger endpoints críticos

## 📊 Monitoreo

### Verificar estado de certificados
- Dashboard → Certificates
- Verás automáticamente cuando expiren los certificados

### Ver logs
- Ir a la terminal dentro del contenedor:
  ```bash
  docker logs nginx-proxy-manager
  ```

## 🚀 URLs después de configurar

- Backend API: `https://api.tu-dominio.com`
- Frontend App: `https://app.tu-dominio.com`
- Admin Panel Nginx: `http://tu-servidor-ip:81` (sin HTTPS, usar firewall)

## ✅ Verificación

Una vez configurado, prueba:
```bash
# Backend
curl https://api.tu-dominio.com/health

# Frontend
curl https://app.tu-dominio.com
```

## 🔐 Consejos de Seguridad

1. Cambiar contraseña admin inmediatamente
2. Usar firewall para limitar acceso al puerto 81 (solo admin)
3. Habilitar "Block Common Exploits" en todos los proxy hosts
4. Revisar logs regularmente
5. Actualizar certificados SSL automáticamente (Let's Encrypt)
