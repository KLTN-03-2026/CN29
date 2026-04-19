import React, { useMemo, useState } from "react";
import usePWAInstallPrompt from "../../hooks/usePWAInstallPrompt";
import "./InstallAppPanel.css";

const PLATFORM_ANDROID = "android";
const PLATFORM_IOS = "ios";
const PLATFORM_DESKTOP = "desktop";

const PLATFORM_LABELS = {
  [PLATFORM_ANDROID]: "Android",
  [PLATFORM_IOS]: "iOS",
  [PLATFORM_DESKTOP]: "Desktop",
};

const InstallAppPanel = () => {
  const {
    isInstalled,
    isStandalone,
    canTriggerPrompt,
    isIOS,
    activePlatform,
    setActivePlatform,
    promptInstall,
    dismissInstall,
    clearDismissed,
    dismissedRecently,
  } = usePWAInstallPrompt();

  const [feedback, setFeedback] = useState("");

  const installSteps = useMemo(
    () => ({
      [PLATFORM_ANDROID]: [
        "Mở JobFinder bằng Chrome hoặc Edge trên Android (không dùng tab ẩn danh).",
        "Đăng nhập tài khoản để đồng bộ thông báo và dữ liệu ngay sau khi cài.",
        "Nhấn biểu tượng cài đặt trên thanh địa chỉ, hoặc mở menu 3 chấm.",
        "Chọn Cài đặt ứng dụng / Add to Home screen và xác nhận Cài đặt.",
        "Mở app từ màn hình chính, vào Thông báo để cấp quyền nếu được hỏi.",
      ],
      [PLATFORM_IOS]: [
        "Mở JobFinder bằng Safari trên iPhone hoặc iPad.",
        "Nhấn nút Chia sẻ (hình vuông có mũi tên) ở thanh dưới/trên.",
        "Chọn Thêm vào Màn hình chính (Add to Home Screen).",
        "Đặt tên dễ nhớ như JobFinder rồi nhấn Thêm.",
        "Mở app từ màn hình chính và bật thông báo trong Cài đặt iOS nếu cần.",
      ],
      [PLATFORM_DESKTOP]: [
        "Mở JobFinder trên Chrome hoặc Edge bản mới nhất.",
        "Đăng nhập tài khoản trước khi cài để giữ trạng thái phiên làm việc.",
        "Nhấn biểu tượng cài đặt ở cạnh thanh địa chỉ (Install app).",
        "Nếu chưa thấy biểu tượng, mở menu trình duyệt và chọn Cài đặt JobFinder.",
        "Sau khi cài, ghim app ra taskbar/start menu để mở nhanh mỗi ngày.",
      ],
    }),
    [],
  );

  const platformTips = useMemo(
    () => ({
      [PLATFORM_ANDROID]: {
        badge: "Khuyến nghị",
        heading: "Mẹo để cài nhanh trên Android",
        items: [
          "Ưu tiên Chrome/Edge vì hỗ trợ PWA ổn định nhất.",
          "Nếu không thấy nút cài đặt, tải lại trang 1-2 lần rồi thử lại.",
          "Sau khi cài, bật thông báo để nhận tin ứng tuyển theo thời gian thực.",
        ],
      },
      [PLATFORM_IOS]: {
        badge: "Lưu ý",
        heading: "iOS cần cài thủ công",
        items: [
          "Safari là trình duyệt bắt buộc để hiện nút Thêm vào Màn hình chính.",
          "Nếu mục Thêm vào Màn hình chính bị ẩn, cuộn xuống trong menu Chia sẻ.",
          "iOS chưa hỗ trợ prompt tự động như Android/Desktop nên hãy làm đúng thứ tự bước.",
        ],
      },
      [PLATFORM_DESKTOP]: {
        badge: "Năng suất",
        heading: "Tối ưu trải nghiệm trên Desktop",
        items: [
          "Sau khi cài, bạn có thể mở như app riêng không cần tab trình duyệt.",
          "Bật thông báo để nhận tin nhắn và cập nhật hồ sơ ngay khi có thay đổi.",
          "Nếu dùng máy công ty, kiểm tra chính sách IT có chặn cài app trình duyệt hay không.",
        ],
      },
    }),
    [],
  );

  const quickChecklist = useMemo(
    () => [
      "Truy cập bằng HTTPS hoặc localhost.",
      "Không mở ở chế độ ẩn danh/private mode.",
      "Cho phép JavaScript và không chặn service worker.",
      "Đảm bảo trình duyệt đã cập nhật phiên bản mới.",
    ],
    [],
  );

  const handleInstallClick = async () => {
    if (isInstalled || isStandalone) {
      setFeedback("Ứng dụng đã được cài đặt trên thiết bị này.");
      return;
    }

    if (isIOS) {
      setFeedback("iOS chưa hỗ trợ prompt tự động. Hãy làm theo hướng dẫn phía dưới để cài thủ công.");
      return;
    }

    if (!canTriggerPrompt) {
      setFeedback(
        "Trình duyệt chưa cấp beforeinstallprompt. Hãy đảm bảo chạy HTTPS hoặc localhost và truy cập lại trang vài giây.",
      );
      return;
    }

    const outcome = await promptInstall();

    if (outcome === "accepted") {
      setFeedback("Cài đặt thành công. Bạn có thể mở JobFinder như ứng dụng độc lập.");
      return;
    }

    if (outcome === "dismissed") {
      setFeedback("Bạn đã đóng hộp thoại cài đặt. Có thể bấm lại bất cứ lúc nào.");
      return;
    }

    setFeedback("Không thể mở prompt cài đặt ở thời điểm này.");
  };

  const installButtonLabel = isInstalled || isStandalone
    ? "Đã cài đặt"
    : isIOS
      ? "Xem hướng dẫn iOS"
      : canTriggerPrompt
        ? "Cài đặt ứng dụng"
        : "Xem hướng dẫn cài thủ công";

  return (
    <section className="install-app-panel" aria-label="Cài đặt ứng dụng JobFinder">
      <div className="install-app-panel__intro">
        <h5>Cài đặt theo thiết bị của bạn</h5>
        <p>
          App sau khi cài sẽ mở nhanh hơn, nhận thông báo ổn định hơn và giảm thao tác đăng nhập lại.
        </p>
      </div>

      <div className="install-app-panel__tabs" role="tablist" aria-label="Nền tảng cài đặt">
        <button
          type="button"
          role="tab"
          className={`install-app-panel__tab ${activePlatform === PLATFORM_ANDROID ? "is-active" : ""}`}
          onClick={() => setActivePlatform(PLATFORM_ANDROID)}
        >
          Android
        </button>
        <button
          type="button"
          role="tab"
          className={`install-app-panel__tab ${activePlatform === PLATFORM_IOS ? "is-active" : ""}`}
          onClick={() => setActivePlatform(PLATFORM_IOS)}
        >
          iOS
        </button>
        <button
          type="button"
          role="tab"
          className={`install-app-panel__tab ${activePlatform === PLATFORM_DESKTOP ? "is-active" : ""}`}
          onClick={() => setActivePlatform(PLATFORM_DESKTOP)}
        >
          Desktop
        </button>
      </div>

      <div className="install-app-panel__body" role="tabpanel">
        <div className="install-app-panel__platform-head">
          <span className="install-app-panel__platform-chip">{PLATFORM_LABELS[activePlatform]}</span>
          <span className="install-app-panel__platform-hint">{platformTips[activePlatform].badge}</span>
        </div>

        <ol className="install-app-panel__steps">
          {installSteps[activePlatform].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="install-app-panel__tip-box">
          <h6>{platformTips[activePlatform].heading}</h6>
          <ul>
            {platformTips[activePlatform].items.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>

        <div className="install-app-panel__checklist">
          <h6>Checklist khi không thấy nút cài đặt</h6>
          <ul>
            {quickChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="install-app-panel__actions">
          <button
            type="button"
            className="install-app-panel__install-btn"
            onClick={handleInstallClick}
            disabled={isInstalled || isStandalone}
          >
            {installButtonLabel}
          </button>

          <button
            type="button"
            className="install-app-panel__later-btn"
            onClick={() => {
              dismissInstall();
              setFeedback("Đã ẩn gợi ý cài đặt trong 7 ngày trên trình duyệt này.");
            }}
          >
            Để sau
          </button>

          {dismissedRecently && (
            <button
              type="button"
              className="install-app-panel__reset-btn"
              onClick={() => {
                clearDismissed();
                setFeedback("Đã bật lại gợi ý cài đặt.");
              }}
            >
              Bật lại gợi ý
            </button>
          )}
        </div>

        {feedback && <p className="install-app-panel__feedback">{feedback}</p>}
      </div>
    </section>
  );
};

export default InstallAppPanel;
