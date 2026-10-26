package com.sparklecow.citofonia.security.ratelimit;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class LoginRateLimitService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(5);

    private final Map<String, AttemptBucket> buckets = new ConcurrentHashMap<>();

    public synchronized AttemptStatus checkAndRecord(String key) {
        AttemptBucket bucket = buckets.computeIfAbsent(key, k -> new AttemptBucket());
        Instant now = Instant.now();
        if (bucket.blockUntil != null && bucket.blockUntil.isAfter(now)) {
            return new AttemptStatus(true, bucket.blockUntil);
        }
        if (bucket.blockUntil != null && bucket.blockUntil.isBefore(now)) {
            bucket.attempts.clear();
            bucket.blockUntil = null;
        }
        bucket.attempts.add(now);
        bucket.attempts.removeIf(t -> t.isBefore(now.minus(BLOCK_DURATION)));
        if (bucket.attempts.size() >= MAX_ATTEMPTS) {
            bucket.blockUntil = now.plus(BLOCK_DURATION);
            bucket.attempts.clear();
            return new AttemptStatus(true, bucket.blockUntil);
        }
        return new AttemptStatus(false, null);
    }

    private static class AttemptBucket {
        private final List<Instant> attempts = new ArrayList<>();
        private Instant blockUntil;
    }

    public record AttemptStatus(boolean blocked, Instant blockUntil) {
    }
}
