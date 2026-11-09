package com.sparklecow.citofonia.notification.push;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PushTokenRequest(
        @NotBlank(message = "Falta el token") @Size(max = 200) String token,
        @Size(max = 16) String platform) {
}
