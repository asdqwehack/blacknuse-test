import Swal from 'sweetalert2';
import FirebaseDataManager from './FirebaseDataManager';
import SecurityManager from './SecurityManager';

class RobloxAccountsManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    this.currentUser = this.getCurrentUser();
    if (!this.currentUser) {
      window.location.href = "auth.html";
      return;
    }

    this.loadRobloxAccountsList();
  }

  getCurrentUser() {
    const user = localStorage.getItem("blacknuse-current-user");
    return user ? JSON.parse(user) : null;
  }

  async registerRobloxAccount() {
    const usernameInput = document.getElementById("roblox-username");
    const username = usernameInput.value.trim();

    if (!username) {
      Swal.fire({
        title: "입력 오류",
        text: "로블록스 사용자 이름을 입력해주세요.",
        icon: "error",
        confirmButtonText: "확인",
      });
      return;
    }

    if (username.length < 3 || username.length > 20) {
      Swal.fire({
        title: "잘못된 형식",
        text: "로블록스 사용자 이름은 3-20자 사이여야 합니다.",
        icon: "error",
        confirmButtonText: "확인",
      });
      return;
    }

    // 이미 등록된 계정인지 확인
    if (this.currentUser.robloxUsername) {
      Swal.fire({
        title: "이미 등록됨",
        text: `현재 등록된 로블록스 계정: ${this.currentUser.robloxUsername}`,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "등록 해제",
        cancelButtonText: "취소",
        confirmButtonColor: "#ff9800",
      }).then((result) => {
        if (result.isConfirmed) {
          this.unregisterCurrentUser();
        }
      });
      return;
    }

    // 다른 사용자가 이미 사용 중인지 확인
    const users = await FirebaseDataManager.getUsers();
    const existingUser = users.find((u) => u.robloxUsername === username);
    if (existingUser) {
      Swal.fire({
        title: "이미 사용 중",
        text: "해당 로블록스 계정은 이미 다른 사용자가 등록했습니다.",
        icon: "error",
        confirmButtonText: "확인",
      });
      return;
    }

    try {
      // 사용자 정보 업데이트
      await FirebaseDataManager.updateUser(this.currentUser.id, {
        robloxUsername: username,
        robloxRegisteredAt: new Date().toISOString(),
      });

      // 현재 사용자 정보 업데이트
      this.currentUser.robloxUsername = username;
      this.currentUser.robloxRegisteredAt = new Date().toISOString();
      localStorage.setItem("blacknuse-current-user", JSON.stringify(this.currentUser));

      usernameInput.value = "";
      this.loadRobloxAccountsList();

      // Discord 알림
      await SecurityManager.sendToDiscord("🎮 로블록스 계정 등록", "새로운 로블록스 계정이 등록되었습니다.", [
        { name: "사용자", value: this.currentUser.username, inline: true },
        { name: "로블록스 계정", value: username, inline: true },
        { name: "등록 시간", value: new Date().toLocaleString("ko-KR"), inline: false },
      ]);

      Swal.fire({
        title: "등록 완료!",
        text: `로블록스 계정 "${username}"이 성공적으로 등록되었습니다.`,
        icon: "success",
        confirmButtonText: "확인",
      });
    } catch (error) {
      console.error("등록 실패:", error);
      Swal.fire({
        title: "등록 실패",
        text: "로블록스 계정 등록 중 오류가 발생했습니다.",
        icon: "error",
        confirmButtonText: "확인",
      });
    }
  }

  async unregisterCurrentUser() {
    if (!this.currentUser || !this.currentUser.robloxUsername) return;

    const oldUsername = this.currentUser.robloxUsername;

    await FirebaseDataManager.updateUser(this.currentUser.id, {
      robloxUsername: "",
      robloxUnregisteredAt: new Date().toISOString(),
    });

    this.currentUser.robloxUsername = "";
    this.currentUser.robloxUnregisteredAt = new Date().toISOString();
    localStorage.setItem("blacknuse-current-user", JSON.stringify(this.currentUser));

    this.loadRobloxAccountsList();

    // Discord 알림
    SecurityManager.sendToDiscord("🚫 로블록스 계정 해제", "로블록스 계정이 해제되었습니다.", [
      { name: "사용자", value: this.currentUser.username, inline: true },
      { name: "해제된 계정", value: oldUsername, inline: true },
      { name: "해제 시간", value: new Date().toLocaleString("ko-KR"), inline: false },
    ]);

    Swal.fire({
      title: "해제 완료",
      text: "로블록스 계정이 해제되었습니다. 다시 등록할 수 있습니다.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  }

  async unregisterRobloxAccount(userId) {
    const users = await FirebaseDataManager.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    Swal.fire({
      title: "로블록스 계정 해제",
      text: `정말 ${user.robloxUsername} 계정을 해제하시겠습니까?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "해제",
      cancelButtonText: "취소",
      confirmButtonColor: "#ff9800",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const oldUsername = user.robloxUsername;

        await FirebaseDataManager.updateUser(userId, {
          robloxUsername: "",
          robloxUnregisteredAt: new Date().toISOString(),
        });

        if (this.currentUser && this.currentUser.id === userId) {
          this.currentUser.robloxUsername = "";
          this.currentUser.robloxUnregisteredAt = new Date().toISOString();
          localStorage.setItem("blacknuse-current-user", JSON.stringify(this.currentUser));
        }

        this.loadRobloxAccountsList();

        // Discord 알림
        SecurityManager.sendToDiscord("🚫 관리자 계정 해제", "관리자가 로블록스 계정을 해제했습니다.", [
          { name: "대상 사용자", value: user.username, inline: true },
          { name: "해제된 계정", value: oldUsername, inline: true },
          { name: "해제 시간", value: new Date().toLocaleString("ko-KR"), inline: false },
        ]);

        Swal.fire({
          title: "해제 완료",
          text: "로블록스 계정이 성공적으로 해제되었습니다.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }

  async showUserDetail(userId) {
    const users = await FirebaseDataManager.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    Swal.fire({
      title: "사용자 상세 정보",
      html: `
                <div style="text-align: left;">
                    <p><strong>사용자명:</strong> ${user.username}</p>
                    <p><strong>이메일:</strong> ${user.email}</p>
                    <p><strong>로블록스 계정:</strong> ${user.robloxUsername}</p>
                    <p><strong>등록일:</strong> ${new Date(user.joinDate).toLocaleString()}</p>
                    <p><strong>로블록스 등록일:</strong> ${
                      user.robloxRegisteredAt ? new Date(user.robloxRegisteredAt).toLocaleString() : "등록되지 않음"
                    }</p>
                    <p><strong>실행한 스크립트 수:</strong> ${user.scriptsExecuted || 0}개</p>
                </div>
            `,
      confirmButtonText: "확인",
      width: "500px",
    });
  }

  async loadRobloxAccountsList() {
    const users = await FirebaseDataManager.getUsers();
    const isAdmin = this.currentUser && this.currentUser.username === "excI" && this.currentUser.role === "admin";

    let robloxUsers;
    if (isAdmin) {
      // 어드민은 모든 사용자의 로블록스 계정을 볼 수 있음
      robloxUsers = users.filter((u) => u.robloxUsername);
    } else {
      // 일반 사용자는 자신의 계정만 볼 수 있음
      robloxUsers = users.filter((u) => u.robloxUsername && u.id === this.currentUser.id);
    }

    const robloxAccountsList = document.getElementById("roblox-accounts-list");

    robloxAccountsList.innerHTML = "";

    if (robloxUsers.length === 0) {
      robloxAccountsList.innerHTML =
        '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">등록된 로블록스 계정이 없습니다.</div>';
      return;
    }

    robloxUsers.forEach((user) => {
      const accountItem = document.createElement("div");
      accountItem.className = "roblox-account-item";

      // 어드민만 관리 버튼을 볼 수 있음
      const actionButtons = isAdmin
        ? `
                    <div class="user-actions">
                        <button class="action-btn view" onclick="robloxAccountsManager.showUserDetail(${user.id})">
                            <i class='bx bx-show'></i> 상세보기
                        </button>
                        <button class="action-btn deregister" onclick="robloxAccountsManager.unregisterRobloxAccount(${user.id})">
                            <i class='bx bx-user-x'></i> 등록 해제
                        </button>
                    </div>
                `
        : "";

      accountItem.innerHTML = `
                <div class="roblox-info">
                    <h4>${user.robloxUsername}</h4>
                    <p>사용자: ${user.username} • 등록일: ${new Date(
        user.robloxRegisteredAt || user.joinDate
      ).toLocaleDateString()}</p>
                </div>
                ${actionButtons}
            `;
      robloxAccountsList.appendChild(accountItem);
    });
  }
}

// 전역에서 사용할 수 있도록 설정
window.RobloxAccountsManager = RobloxAccountsManager;
