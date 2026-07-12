package com.travinh.realty.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailSenderTest {

    @Test
    void sendBuildsAndSendsASimpleMailMessageWithGivenFields() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        SmtpEmailSender sender = new SmtpEmailSender(mailSender);

        sender.send("broker@congtinland.vn", "Mã OTP khôi phục mật khẩu", "Mã của bạn là 123456");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertThat(sent.getTo()).containsExactly("broker@congtinland.vn");
        assertThat(sent.getSubject()).isEqualTo("Mã OTP khôi phục mật khẩu");
        assertThat(sent.getText()).isEqualTo("Mã của bạn là 123456");
    }

    @Test
    void sendPropagatesMailExceptionsToTheCaller() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        // JavaMailSender#send returns void; stubbing a void method to throw uses doThrow, not when(...).
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        SmtpEmailSender sender = new SmtpEmailSender(mailSender);

        assertThatThrownBy(() -> sender.send("broker@congtinland.vn", "Subject", "Body"))
                .isInstanceOf(MailSendException.class);
    }
}
