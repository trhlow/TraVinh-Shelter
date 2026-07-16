# Nhóm 1 — 5 fix nhỏ, độc lập — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 small, independent fixes: category grid CSS, Vietnamese mobile phone validation on the admin create-broker form, removing the "Tin nhắn" placeholder, merging "Cài đặt"/"Hồ sơ môi giới" into one destination, and fixing the broker dashboard's "Loại hình BĐS quản lý" chart to use 3 real categories with no double-counting.

**Architecture:** 5 independent tasks. Task 1 (CSS-only) has zero code overlap with the others. Task 2 (phone validation) spans frontend + backend but is one coherent feature. Tasks 3, 4, and 5 all modify `BrokerDashboard.jsx` and/or `routes/index.jsx` in adjacent-but-distinct regions (sidebar array, JSX section blocks, title/subtitle maps, a builder function) — run them sequentially (never in parallel) so each task's implementer reads the live file state left by the previous task, not stale line numbers from this plan.

**Tech Stack:** React 19 (frontend), Spring Boot 3.4.5 / Java 21 (backend), Vitest + Testing Library (FE tests), JUnit 5 (BE tests).

## Global Constraints

- Conventional commits, English commit messages, no `Co-Authored-By` trailer.
- Frontend tests: `cd frontend-react && npm test -- --run`. Baseline before this plan: 151/151.
- Backend tests: `cd backend-springboot && mvn test`. Record the exact baseline count in Task 2 before making backend changes (this project's backend test count has drifted across sessions — do not assume a stale number).
- Backend Maven runs need `JAVA_HOME` pointed at JDK 25 in this environment (`pom.xml` pins `<java.version>25</java.version>`) — e.g. `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test` on Windows/Git Bash. If `mvn test` fails with "class file version 69.0 ... only recognizes up to 65.0", this is why — not a real failure.
- No hard-coded `#hex` colors, no new inline styles introduced by any task in this plan.

---

### Task 1: Category grid fills 3 real cards

**Files:**
- Modify: `frontend-react/src/styles/home.css:275-282`

**Interfaces:** None — pure CSS, no other task depends on this.

- [ ] **Step 1: Change the grid column count**

In `frontend-react/src/styles/home.css`, change:

```css
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

@media (max-width: 1024px) { .category-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px)  { .category-grid { grid-template-columns: repeat(2, 1fr); } }
```

to:

```css
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (max-width: 640px)  { .category-grid { grid-template-columns: repeat(2, 1fr); } }
```

(The `≤1024px` breakpoint is deleted — it set `repeat(3, 1fr)`, which is now identical to the default, making it dead weight.)

- [ ] **Step 2: Manual visual check note**

No automated test covers grid column count (jsdom doesn't compute CSS grid layout). Note in your report that this is a CSS-only visual change — the existing `HomePage.test.jsx` tests (card count, labels) already verify the 3 cards render; they don't and can't assert on `grid-template-columns`. No new test needed for this task.

- [ ] **Step 3: Run the full frontend suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 151/151 (no tests added or removed by this task).

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/styles/home.css
git commit -m "fix(homepage): fill the category grid with the 3 real category cards"
```

---

### Task 2: Vietnamese mobile phone validation on the admin create-broker form

**Files:**
- Modify: `frontend-react/src/pages/admin/BrokersSection.jsx:68`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CreateBrokerRequest.java`
- Test: `frontend-react/src/pages/admin/BrokersSection.test.jsx`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/user/CreateBrokerRequestValidationTest.java` (new file)

**Interfaces:** None — no other task depends on this validation.

- [ ] **Step 1: Record the backend test baseline**

Run: `cd "d:/TraVinh Shelter/backend-springboot" && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test`
Record the printed `Tests run: X, Failures: 0, Errors: 0` total — your baseline to compare against after this task.

- [ ] **Step 2: Write the failing backend validation test**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/user/CreateBrokerRequestValidationTest.java`:

```java
package com.travinh.realty.modules.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.user.dto.CreateBrokerRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CreateBrokerRequestValidationTest {

    private final Validator validator;

    CreateBrokerRequestValidationTest() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    private CreateBrokerRequest requestWithPhone(String phone) {
        return new CreateBrokerRequest("broker.one", "broker@example.com", "correct-horse-battery-staple",
                "Broker One", phone);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "123", "0123456789", "091234567", "09123456789", "abcdefghij", ""})
    void rejectsInvalidPhoneFormats(String phone) {
        Set<ConstraintViolation<CreateBrokerRequest>> violations = validator.validate(requestWithPhone(phone));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("phone"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0912345678", "0987654321", "0765432109", "0812345678", "0325678901"})
    void acceptsValidVietnameseMobileNumbers(String phone) {
        Set<ConstraintViolation<CreateBrokerRequest>> violations = validator.validate(requestWithPhone(phone));
        assertThat(violations).noneMatch(v -> v.getPropertyPath().toString().equals("phone"));
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/backend-springboot" && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=CreateBrokerRequestValidationTest`
Expected: FAIL — `rejectsInvalidPhoneFormats` fails because no `@Pattern` constraint exists yet on `phone`, so invalid strings produce zero violations.

- [ ] **Step 4: Add `@Pattern` to `CreateBrokerRequest.phone`**

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CreateBrokerRequest.java`, change:

```java
package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBrokerRequest(
        @NotBlank @Size(min = 3, max = 50)
        @Pattern(regexp = "^[A-Za-z0-9_.-]+$") String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 30) String phone
) {
}
```

to:

```java
package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBrokerRequest(
        @NotBlank @Size(min = 3, max = 50)
        @Pattern(regexp = "^[A-Za-z0-9_.-]+$") String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 30)
        @Pattern(regexp = "^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$",
                message = "phone must be a valid Vietnamese mobile number") String phone
) {
}
```

- [ ] **Step 5: Run the backend test to verify it passes**

Run: `cd "d:/TraVinh Shelter/backend-springboot" && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=CreateBrokerRequestValidationTest`
Expected: PASS — both parameterized tests, all values.

- [ ] **Step 6: Run the full backend suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/backend-springboot" && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test`
Expected: PASS — Step 1's baseline + 12 new test cases (`rejectsInvalidPhoneFormats` × 7 `@ValueSource` values + `acceptsValidVietnameseMobileNumbers` × 5 values — JUnit reports each parameterized value as its own test), zero failures.

- [ ] **Step 7: Write the failing frontend test**

In `frontend-react/src/pages/admin/BrokersSection.test.jsx`, add this test after the existing 3 tests:

```javascript
test('phone input enforces the Vietnamese mobile number pattern', () => {
  render(
    <BrokersSection
      data={{ brokers: [] }}
      loading={false}
      saving={false}
      actions={{ createBrokerAccount: vi.fn(), toggleUserStatus: vi.fn() }}
    />,
  );
  const phoneInput = screen.getByLabelText('Số điện thoại');
  expect(phoneInput).toHaveAttribute('pattern', '0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}');
  expect(phoneInput).toHaveAttribute('maxlength', '10');
  expect(phoneInput.checkValidity()).toBe(false);

  fireEvent.change(phoneInput, { target: { value: '0912345678' } });
  expect(phoneInput.checkValidity()).toBe(true);

  fireEvent.change(phoneInput, { target: { value: '1' } });
  expect(phoneInput.checkValidity()).toBe(false);
});
```

Add `BrokersSection` to the existing import at the top of the file (it currently only imports `{ AccountStatusToggle }` from `'./BrokersSection.jsx'`):

```javascript
import BrokersSection, { AccountStatusToggle } from './BrokersSection.jsx';
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/admin/BrokersSection.test.jsx`
Expected: FAIL — the `phoneInput` has no `pattern`/`maxlength` attribute yet, so the `toHaveAttribute` assertions fail.

- [ ] **Step 9: Add the phone input validation attributes**

In `frontend-react/src/pages/admin/BrokersSection.jsx`, change line 68 from:

```jsx
        <FormField label="Số điện thoại"><input className="input" value={brokerForm.phone} onChange={(event) => setBrokerValue('phone', event.target.value)} required /></FormField>
```

to:

```jsx
        <FormField label="Số điện thoại">
          <input
            className="input"
            type="tel"
            value={brokerForm.phone}
            onChange={(event) => setBrokerValue('phone', event.target.value)}
            required
            pattern="0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}"
            maxLength={10}
            title="Số điện thoại di động Việt Nam hợp lệ, VD: 0912345678"
          />
        </FormField>
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/admin/BrokersSection.test.jsx`
Expected: PASS — all 4 tests.

- [ ] **Step 11: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 152/152 (151 baseline + 1 new).

- [ ] **Step 12: Commit**

```bash
git add frontend-react/src/pages/admin/BrokersSection.jsx frontend-react/src/pages/admin/BrokersSection.test.jsx \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CreateBrokerRequest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/user/CreateBrokerRequestValidationTest.java
git commit -m "feat(admin): validate broker phone numbers against Vietnamese mobile carrier formats"
```

---

### Task 3: Remove the "Tin nhắn" placeholder entirely

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/routes/index.jsx`

**Interfaces:** None — no other task depends on the messaging section existing or not.

- [ ] **Step 1: Remove the sidebar nav item**

In `frontend-react/src/pages/BrokerDashboard.jsx`, find `BROKER_SIDEBAR_ITEMS` and change:

```javascript
const BROKER_SIDEBAR_ITEMS = [
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Tổng quan' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
  { href: '#/broker/leads', icon: 'Users', label: 'Khách hàng tiềm năng' },
  { href: '#/broker/viewings', icon: 'Calendar', label: 'Lịch hẹn' },
  { href: '#/broker/messages', icon: 'MessageCircle', label: 'Tin nhắn' },
  { href: '#/broker/settings', icon: 'Settings', label: 'Cài đặt' },
];
```

to:

```javascript
const BROKER_SIDEBAR_ITEMS = [
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Tổng quan' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
  { href: '#/broker/leads', icon: 'Users', label: 'Khách hàng tiềm năng' },
  { href: '#/broker/viewings', icon: 'Calendar', label: 'Lịch hẹn' },
  { href: '#/broker/settings', icon: 'Settings', label: 'Cài đặt' },
];
```

- [ ] **Step 2: Remove the messages section JSX**

In the same file, find and delete this block entirely:

```jsx
          {section === 'messages' && (
            <DashboardPanel title="Tin nhắn">
              <StateBlock icon="MessageCircle" title="Chưa có trung tâm tin nhắn" description="Khi dự án có module chat, tin nhắn từ khách hàng sẽ hiển thị tại đây." />
            </DashboardPanel>
          )}

```

- [ ] **Step 3: Remove `messages` from the title/subtitle maps**

Find `brokerTitle(section)` and delete the `messages: 'Tin nhắn',` line:

```javascript
function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    profile: 'Hồ sơ môi giới',
    properties: 'Tin đăng của tôi',
    leads: 'Khách hàng tiềm năng',
    viewings: 'Lịch hẹn xem',
    messages: 'Tin nhắn',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}
```

Delete just the `messages:` line (leave `profile:` for now — Task 4 handles it):

```javascript
function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    profile: 'Hồ sơ môi giới',
    properties: 'Tin đăng của tôi',
    leads: 'Khách hàng tiềm năng',
    viewings: 'Lịch hẹn xem',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}
```

Find `brokerSubtitle(section, monthLabel)` and delete the `messages:` line the same way:

```javascript
function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    profile: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    leads: 'Theo dõi phễu chuyển đổi khách hàng từ lead mới đến giao dịch.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    messages: 'Không gian tập trung trao đổi với khách quan tâm tin đăng.',
    settings: 'Cấu hình nhanh các thông tin tài khoản môi giới.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}
```

becomes (only the `messages:` line removed — `profile:`/`settings:` text untouched here, Task 4 handles those):

```javascript
function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    profile: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    leads: 'Theo dõi phễu chuyển đổi khách hàng từ lead mới đến giao dịch.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    settings: 'Cấu hình nhanh các thông tin tài khoản môi giới.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}
```

- [ ] **Step 4: Remove the route**

In `frontend-react/src/routes/index.jsx`, delete this function:

```javascript
function BrokerMessagesRoute(props) {
  return <BrokerDashboard {...props} section="messages" currentPath="/broker/messages" />;
}
```

and delete this line from the `routes` object:

```javascript
  '/broker/messages': BrokerMessagesRoute,
```

- [ ] **Step 5: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — same count as before this task (no test referenced "Tin nhắn"/messages, confirmed via grep before writing this plan — nothing to update, nothing new to add).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/routes/index.jsx
git commit -m "chore(broker): remove the Tin nhắn placeholder — no messaging module exists"
```

---

### Task 4: Merge "Cài đặt" and "Hồ sơ môi giới" into one destination

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/routes/index.jsx`
- Modify: `frontend-react/src/App.test.jsx:53`
- Modify: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx:80-99`

**Interfaces:** None — no other task depends on the `profile`/`settings` section split.

- [ ] **Step 1: Change the profile JSX block's condition to `settings`**

In `frontend-react/src/pages/BrokerDashboard.jsx`, find the line:

```jsx
          {section === 'profile' && (
```

(it opens the block containing `<DashboardPanel title="Hồ sơ đang hiển thị" ...>`, the profile form, and the password-change form — this block runs through the matching `)}` right before `{section === 'properties' && (`). Change just this one line to:

```jsx
          {section === 'settings' && (
```

- [ ] **Step 2: Delete the old settings placeholder block**

In the same file, delete this block entirely (it directly follows the `messages` block Task 3 already removed, or directly follows the password-change form's closing if Task 3 ran first — locate by its exact content, not by line number):

```jsx
          {section === 'settings' && (
            <DashboardPanel title="Cài đặt tài khoản" action={<a className="btn btn-primary btn-sm" href="#/broker/profile">Mở hồ sơ</a>}>
              <StateBlock icon="Settings" title="Cài đặt đang dùng hồ sơ môi giới" description="Thông tin liên hệ, mạng xã hội và đổi mật khẩu hiện nằm trong mục Hồ sơ môi giới." />
            </DashboardPanel>
          )}

```

(After Step 1, there are two `{section === 'settings' && (...)}` blocks in the file — the real one from Step 1, and this placeholder. Delete only the placeholder, keep the one from Step 1.)

- [ ] **Step 3: Repoint the 2 internal links from `/broker/profile` to `/broker/settings`**

Find and change:

```jsx
                    Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin. <a className="auth-link" href="#/broker/profile">Mở hồ sơ</a>
```

to:

```jsx
                    Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin. <a className="auth-link" href="#/broker/settings">Mở hồ sơ</a>
```

Find and change:

```jsx
      <a className="auth-btn" href="#/broker/profile">
        Mở hồ sơ
      </a>
```

to:

```jsx
      <a className="auth-btn" href="#/broker/settings">
        Mở hồ sơ
      </a>
```

- [ ] **Step 4: Update the title/subtitle maps**

Find `brokerTitle(section)` (already missing its `messages:` line if Task 3 ran first) and delete the `profile:` line — the `settings:` key already has the right label ("Cài đặt"), keep it as-is:

```javascript
function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    profile: 'Hồ sơ môi giới',
    properties: 'Tin đăng của tôi',
    leads: 'Khách hàng tiềm năng',
    viewings: 'Lịch hẹn xem',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}
```

becomes:

```javascript
function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    properties: 'Tin đăng của tôi',
    leads: 'Khách hàng tiềm năng',
    viewings: 'Lịch hẹn xem',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}
```

Find `brokerSubtitle(section, monthLabel)` and delete the `profile:` line, replacing `settings:`'s value with the old profile subtitle (it now describes what's really shown):

```javascript
function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    profile: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    leads: 'Theo dõi phễu chuyển đổi khách hàng từ lead mới đến giao dịch.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    settings: 'Cấu hình nhanh các thông tin tài khoản môi giới.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}
```

becomes:

```javascript
function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    leads: 'Theo dõi phễu chuyển đổi khách hàng từ lead mới đến giao dịch.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    settings: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}
```

- [ ] **Step 5: Remove the `/broker/profile` route**

In `frontend-react/src/routes/index.jsx`, delete this function:

```javascript
function BrokerProfileRoute(props) {
  return <BrokerDashboard {...props} section="profile" currentPath="/broker/profile" />;
}
```

and delete this line from the `routes` object:

```javascript
  '/broker/profile': BrokerProfileRoute,
```

(`BrokerSettingsRoute` and its `'/broker/settings': BrokerSettingsRoute` entry already exist and already point at `section="settings"` — no change needed there, it now renders the real content because of Step 1.)

- [ ] **Step 6: Update `App.test.jsx`**

In `frontend-react/src/App.test.jsx`, change:

```javascript
  window.location.hash = '#/broker/profile';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Hồ sơ môi giới' }).length).toBeGreaterThan(0);
```

to:

```javascript
  window.location.hash = '#/broker/settings';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Cài đặt' }).length).toBeGreaterThan(0);
```

(The heading text changes because `brokerTitle('settings')` now returns `'Cài đặt'`, not `'Hồ sơ môi giới'` — Step 4 removed the `profile` key entirely, so the page header for this route now reads "Cài đặt".)

- [ ] **Step 7: Update `BrokerDashboard.filter.test.jsx`**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, change:

```javascript
test('profile form has Facebook and TikTok fields and submits them', async () => {
  const { updateCurrentProfile } = await import('../services/api.js');
  render(<BrokerDashboard session={session} section="profile" currentPath="/broker/profile" />);
```

to:

```javascript
test('settings tab has Facebook and TikTok fields and submits them', async () => {
  const { updateCurrentProfile } = await import('../services/api.js');
  render(<BrokerDashboard session={session} section="settings" currentPath="/broker/settings" />);
```

(Leave the rest of the test body unchanged — it queries by field label, not by section/route, so it still passes once the form renders under `section="settings"`.)

- [ ] **Step 8: Run the 2 affected test files**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/App.test.jsx src/pages/BrokerDashboard.filter.test.jsx`
Expected: PASS.

- [ ] **Step 9: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — same total as after Task 3 (this task renames/repoints existing tests, adds none).

- [ ] **Step 10: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/routes/index.jsx \
        frontend-react/src/App.test.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "refactor(broker): merge Cài đặt and Hồ sơ môi giới into one destination"
```

---

### Task 5: Fix "Loại hình BĐS quản lý" to use 3 real categories, no double-counting

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx:1190-1201`
- Test: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:**
- Produces: `export function buildManagedTypeData(listings)` — was module-private (not exported); this task exports it so it can be unit-tested directly, matching the existing pattern for other pure builder functions in this codebase (e.g. `buildWardData`, `buildCategoryDensityData` in `Charts.jsx`).

- [ ] **Step 1: Write the failing test**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, add this import to the existing import list at the top (it currently imports `BrokerDashboard` as a default export only from `'./BrokerDashboard.jsx'`):

```javascript
import BrokerDashboard, { buildManagedTypeData } from './BrokerDashboard.jsx';
```

Then add this test anywhere after the imports:

```javascript
test('buildManagedTypeData counts listings into exactly 3 real categories with no double-counting', () => {
  const listings = [
    { category: 'tro' },
    { category: 'tro' },
    { category: 'nha', transaction: 'sale' },
    { category: 'nha', transaction: 'rent' },
    { category: 'dat' },
  ];
  const data = buildManagedTypeData(listings);

  expect(data).toEqual([
    { label: 'Trọ', value: 2 },
    { label: 'Nhà', value: 2 },
    { label: 'Đất', value: 1 },
  ]);
  // total across all 3 buckets must equal the input length exactly — proves no double-count
  expect(data.reduce((sum, item) => sum + item.value, 0)).toBe(listings.length);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: FAIL — `buildManagedTypeData` is not exported yet, so the import resolves to `undefined` and the test errors calling it as a function.

- [ ] **Step 3: Rewrite `buildManagedTypeData`**

In `frontend-react/src/pages/BrokerDashboard.jsx`, change:

```javascript
function buildManagedTypeData(listings) {
  const houseSale = listings.filter((item) => item.category === 'nha' && item.transaction !== 'rent').length;
  const land = listings.filter((item) => item.category === 'dat' || item.category === 'land').length;
  const apartment = listings.filter((item) => item.category === 'apartment' || (item.category === 'nha' && item.transaction === 'rent')).length;
  const rentals = listings.filter((item) => item.category === 'tro' || item.transaction === 'rent').length;
  return [
    { label: 'Nhà phố', value: houseSale },
    { label: 'Đất nền', value: land },
    { label: 'Căn hộ', value: apartment },
    { label: 'Cho thuê', value: rentals },
  ].map((item) => ({ ...item, value: item.value || 0 }));
}
```

to:

```javascript
export function buildManagedTypeData(listings) {
  const tro = listings.filter((item) => item.category === 'tro').length;
  const nha = listings.filter((item) => item.category === 'nha').length;
  const dat = listings.filter((item) => item.category === 'dat').length;
  return [
    { label: 'Trọ', value: tro },
    { label: 'Nhà', value: nha },
    { label: 'Đất', value: dat },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: PASS — all tests in this file, including the new one.

- [ ] **Step 5: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — Task 2's total + 1 new test.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "fix(broker): compute Loại hình BĐS quản lý from 3 real categories, no double-count"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
cd "d:/TraVinh Shelter/backend-springboot" && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
```

Expected: frontend 153/153 (151 baseline + 1 from Task 2 + 1 from Task 5); backend Task 2's post-change count (baseline + 12 new parameterized cases).

Manual check (once committed): run `npm run dev` + `mvn spring-boot:run` (or `docker compose up --build`), and confirm: homepage category grid shows exactly 3 cards filling the row; admin "Cấp tài khoản môi giới" rejects a 1-character phone and accepts a real Vietnamese mobile number; broker dashboard sidebar has no "Tin nhắn" item; broker dashboard's "Cài đặt" tab shows the real profile form (not a placeholder), and there's only one such tab in the sidebar; broker dashboard's "Loại hình BĐS đang quản lý" donut chart shows exactly 3 slices (Trọ/Nhà/Đất) that sum to the broker's total listing count.
