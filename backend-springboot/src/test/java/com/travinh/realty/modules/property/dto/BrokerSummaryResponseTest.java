package com.travinh.realty.modules.property.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.user.model.User;
import org.junit.jupiter.api.Test;

class BrokerSummaryResponseTest {

    @Test
    void fromMapsSocialLinksIncludingTiktokUrl() {
        User broker = User.createBroker("linh", "linh@example.com", "hash", "Trần Mỹ Linh", "0900000111");
        broker.updateProfile("Trần Mỹ Linh", "0900000111", "https://zalo.me/linh",
                "https://facebook.com/linh", "https://tiktok.com/@linh");

        BrokerSummaryResponse response = BrokerSummaryResponse.from(broker);

        assertThat(response.zaloUrl()).isEqualTo("https://zalo.me/linh");
        assertThat(response.facebookUrl()).isEqualTo("https://facebook.com/linh");
        assertThat(response.tiktokUrl()).isEqualTo("https://tiktok.com/@linh");
    }
}
