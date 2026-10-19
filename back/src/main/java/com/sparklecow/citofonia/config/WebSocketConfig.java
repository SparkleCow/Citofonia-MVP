package com.sparklecow.citofonia.config;

import com.sparklecow.citofonia.security.StompJwtAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuracion del broker STOMP sobre WebSocket.
 *
 * <p>El cliente se conecta a {@code /ws} (autenticando con JWT en el frame
 * {@code CONNECT}) y se suscribe a destinos de usuario
 * ({@code /user/queue/...}). El broker es el simple en memoria de Spring:
 * no requiere servidor externo y basta para push en una unica instancia.</p>
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompJwtAuthInterceptor stompJwtAuthInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket nativo (el front usa @stomp/stompjs con brokerURL directo)
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompJwtAuthInterceptor);
    }
}
