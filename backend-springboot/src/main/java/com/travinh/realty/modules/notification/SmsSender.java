package com.travinh.realty.modules.notification;

public interface SmsSender {
    void send(String phone, String message);
}
