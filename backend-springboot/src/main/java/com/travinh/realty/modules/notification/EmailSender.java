package com.travinh.realty.modules.notification;

public interface EmailSender {
    void send(String to, String subject, String body);
}
