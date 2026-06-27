package com.travinh.realty.modules.auth.security;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.user.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final JwtProperties properties;
    private final SecretKey signingKey;
    private final RevokedTokenStore revokedTokens;

    public JwtService(JwtProperties properties) {
        this(properties, new RevokedTokenStore());
    }

    @Autowired
    public JwtService(JwtProperties properties, RevokedTokenStore revokedTokens) {
        this.properties = properties;
        this.revokedTokens = revokedTokens;
        if (properties.secret() == null || properties.secret().isBlank() || properties.secret().contains("${")) {
            throw new IllegalStateException("JWT_SECRET environment variable is required when the local profile is not active");
        }
        byte[] keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) throw new IllegalArgumentException("JWT secret must contain at least 32 bytes");
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }
    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getEmail()).claim("uid", user.getId().toString())
                .claim("role", user.getRole().name()).id(UUID.randomUUID().toString()).issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(properties.expiration()))).signWith(signingKey).compact();
    }
    public String extractEmail(String token) { return parseClaims(token).getSubject(); }
    public boolean isTokenValid(String token, UserPrincipal principal) {
        Claims claims = parseClaims(token);
        return claims.getSubject().equals(principal.getUsername())
                && claims.getExpiration().after(new Date())
                && !revokedTokens.isRevoked(claims.getId());
    }

    public void revoke(String token) {
        Claims claims = parseClaims(token);
        revokedTokens.revoke(claims.getId(), claims.getExpiration().toInstant());
    }

    private Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    }
}
