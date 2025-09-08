# 🛡️ Security Guidelines

## 📋 Environment Variables

### Required Environment Variables (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# SFTP Configuration  
SFTP_HOST=your.sftp.server.com
SFTP_PORT=22
SFTP_USER=your_username
SFTP_PASSWORD=your_secure_password
SFTP_DIRECTORY=your_directory

# Google Gemini AI (Optional)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
```

### 🚨 Security Best Practices

#### ✅ DO:
- Keep all secrets in environment variables
- Use strong, unique passwords for SFTP
- Regularly rotate API keys and passwords
- Use different credentials for development/production
- Monitor Supabase logs for unusual activity

#### ❌ DON'T:
- Never commit .env files to version control
- Never hardcode secrets in source code
- Don't share environment files via email/chat
- Don't use weak or default passwords
- Never expose service role keys in client-side code

## 🔐 Access Control

### Supabase Security
- **Anon Key**: Safe for frontend (public access)
- **Service Role Key**: CRITICAL - Server-side only, full database access

### SFTP Security
- Use secure passwords with special characters
- Restrict SFTP user access to specific directories
- Consider using SSH key authentication instead of passwords

## 🚨 Security Incident Response

If you suspect a security breach:

1. **Immediately rotate all credentials**
2. **Check Supabase logs** for unauthorized access
3. **Review SFTP server logs** for suspicious activity
4. **Update all environment variables**
5. **Redeploy applications** with new credentials

## 🔍 Security Checklist

- [ ] All secrets moved to environment variables
- [ ] .env* files in .gitignore
- [ ] Strong SFTP passwords set
- [ ] Supabase RLS policies enabled
- [ ] Regular credential rotation scheduled
- [ ] Security monitoring enabled

---

**Last Updated**: January 2025
**Next Review**: February 2025