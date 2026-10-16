package com.sparklecow.citofonia.config;

import com.sparklecow.citofonia.security.DatabaseUserDetailsService;
import com.sparklecow.citofonia.security.JwtAuthenticationFilter;
import com.sparklecow.citofonia.security.RestAccessDeniedHandler;
import com.sparklecow.citofonia.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Configuracion central de Spring Security.
 *
 * <p>API stateless con JWT: sin sesiones ni CSRF. La autenticacion se resuelve
 * con un {@link DaoAuthenticationProvider} (BCrypt + {@link DatabaseUserDetailsService})
 * y la autorizacion se refuerza en dos capas: reglas del filtro HTTP y
 * anotaciones {@code @PreAuthorize} en controllers.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   AuthenticationProvider authenticationProvider) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Endpoints publicos
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/register/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/error").permitAll()
                        // Gestion de usuarios: exclusiva de administradores
                        .requestMatchers(HttpMethod.POST, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("ADMIN")
                        // Escritura de apartamentos: exclusiva de administradores.
                        // La lectura (GET) se autoriza via @PreAuthorize (ADMIN o SECURITY).
                        .requestMatchers(HttpMethod.POST, "/api/apartments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/apartments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/apartments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/apartments/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Proveedor de autenticacion DAO: consulta usuarios en BD y valida la
     * contrasena con BCrypt.
     */
    @Bean
    public AuthenticationProvider authenticationProvider(DatabaseUserDetailsService userDetailsService,
                                                         PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
