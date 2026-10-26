package com.sparklecow.citofonia.security.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(5);
    private static final Duration WINDOW = Duration.ofMinutes(5);

    private final LoginRateLimitService rateLimitService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!"/api/auth/login".equals(path)) {
            return true;
        }
        return !"POST".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String key = getKey(request);
        LoginRateLimitService.AttemptStatus status = rateLimitService.checkAndRecord(key);
        if (status.blocked()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            long secondsLeft = Duration.between(Instant.now(), status.blockUntil()).getSeconds();
            if (secondsLeft < 0) {
                secondsLeft = 0;
            }
            response.getWriter().write("{\"status\":429,\"message\":\"Demasiados intentos de inicio de sesion. "
                    + "Intentalo de nuevo en " + secondsLeft + " segundos.\",\"error\":\"Too Many Requests\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private String getKey(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            ip = ip.split(",")[0].trim();
        } else {
            ip = request.getRemoteAddr();
        }
        return ip + ":" + request.getRequestURI();
    }
}
