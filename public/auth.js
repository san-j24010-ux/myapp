"use strict";

(() => {
  const OTP_RESEND_SECONDS = 60;
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const config = window.SUPABASE_CONFIG || {};
  const isConfigured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || "")
    && typeof config.publishableKey === "string"
    && !config.publishableKey.includes("YOUR_");
  const client =
    isConfigured && window.supabase?.createClient
      ? window.supabase.createClient(config.url, config.publishableKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      : null;

  const elements = {
    guestNav: document.getElementById("guest-nav"),
    userNav: document.getElementById("user-nav"),
    navUserName: document.getElementById("nav-user-name"),
    navLoginButton: document.getElementById("nav-login-button"),
    navSignupButton: document.getElementById("nav-signup-button"),
    navProfileButton: document.getElementById("nav-profile-button"),
    navLogoutButton: document.getElementById("nav-logout-button"),
    loginForm: document.getElementById("login-form"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    loginMessage: document.getElementById("login-message"),
    loginSubmitButton: document.getElementById("login-submit-button"),
    loginToSignupButton: document.getElementById("login-to-signup-button"),
    loginHomeButton: document.getElementById("login-home-button"),
    signupEmailStep: document.getElementById("signup-email-step"),
    signupCodeStep: document.getElementById("signup-code-step"),
    signupPasswordStep: document.getElementById("signup-password-step"),
    signupProfileStep: document.getElementById("signup-profile-step"),
    progressEmail: document.getElementById("progress-email"),
    progressCode: document.getElementById("progress-code"),
    progressPassword: document.getElementById("progress-password"),
    progressProfile: document.getElementById("progress-profile"),
    signupEmailForm: document.getElementById("signup-email-form"),
    signupEmail: document.getElementById("signup-email"),
    signupEmailMessage: document.getElementById("signup-email-message"),
    sendCodeButton: document.getElementById("send-code-button"),
    codeEmailLabel: document.getElementById("code-email-label"),
    signupCodeForm: document.getElementById("signup-code-form"),
    signupCode: document.getElementById("signup-code"),
    signupCodeMessage: document.getElementById("signup-code-message"),
    verifyCodeButton: document.getElementById("verify-code-button"),
    resendCodeButton: document.getElementById("resend-code-button"),
    signupPasswordForm: document.getElementById("signup-password-form"),
    signupPassword: document.getElementById("signup-password"),
    signupPasswordConfirm: document.getElementById("signup-password-confirm"),
    signupPasswordMessage: document.getElementById("signup-password-message"),
    setPasswordButton: document.getElementById("set-password-button"),
    signupProfileForm: document.getElementById("signup-profile-form"),
    signupName: document.getElementById("signup-name"),
    signupGender: document.getElementById("signup-gender"),
    signupAge: document.getElementById("signup-age"),
    signupBio: document.getElementById("signup-bio"),
    signupAvatar: document.getElementById("signup-avatar"),
    signupAvatarPreview: document.getElementById("signup-avatar-preview"),
    signupProfileMessage: document.getElementById("signup-profile-message"),
    completeSignupButton: document.getElementById("complete-signup-button"),
    signupToLoginButton: document.getElementById("signup-to-login-button"),
    signupHomeButton: document.getElementById("signup-home-button"),
    profileForm: document.getElementById("profile-form"),
    profileEmail: document.getElementById("profile-email"),
    profileName: document.getElementById("profile-name"),
    profileGender: document.getElementById("profile-gender"),
    profileAge: document.getElementById("profile-age"),
    profileBio: document.getElementById("profile-bio"),
    profileAvatarFile: document.getElementById("profile-avatar-file"),
    profileAvatarPreview: document.getElementById("profile-avatar-preview"),
    profileAvatarImage: document.getElementById("profile-avatar-image"),
    profileAvatarPlaceholder: document.getElementById("profile-avatar-placeholder"),
    profileMessage: document.getElementById("profile-message"),
    saveProfileButton: document.getElementById("save-profile-button"),
    profileHomeButton: document.getElementById("profile-home-button"),
    profileLogoutButton: document.getElementById("profile-logout-button"),
  };

  let signupEmailAddress = "";
  let currentUser = null;
  let currentProfile = null;
  let signupSessionCreated = false;
  let resendTimerId = null;
  let previewUrl = null;

  function showScreen(name) {
    window.quizApp.showScreen(name);
  }

  function showMessage(element, message, isSuccess = false) {
    element.textContent = message;
    element.hidden = !message;
    element.classList.toggle("is-success", Boolean(message && isSuccess));
  }

  function setBusy(button, isBusy, busyText) {
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
    button.disabled = isBusy;
    button.textContent = isBusy ? busyText : button.dataset.defaultText;
  }

  function validateEmail(email) {
    const value = email.trim().toLowerCase();
    if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "有効なメールアドレスを入力してください。";
    }
    return "";
  }

  function validatePassword(password, confirmation) {
    if (password.length < 12 || password.length > 128) {
      return "パスワードは12〜128文字で入力してください。";
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return "パスワードには半角の大文字・小文字・数字を含めてください。";
    }
    if (password !== confirmation) return "確認用パスワードが一致しません。";
    return "";
  }

  function validateProfile(name, age, bio) {
    if (!name || name.length > 40) return "名前は1〜40文字で入力してください。";
    const numericAge = Number(age);
    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      return "年齢は1〜120の整数で入力してください。";
    }
    if (String(bio || "").length > 300) return "自己紹介は300文字以内で入力してください。";
    return "";
  }

  function validateAvatar(file) {
    if (!file) return "";
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      return "アイコンはJPEG、PNG、WebP形式を選択してください。";
    }
    if (file.size > MAX_AVATAR_BYTES) return "アイコンは2MB以下にしてください。";
    return "";
  }

  function translateAuthError(error) {
    const message = String(error?.message || "");
    if (/invalid login credentials/i.test(message)) {
      return "メールアドレスまたはパスワードが正しくありません。";
    }
    if (/token.*expired|expired.*token/i.test(message)) {
      return "認証コードの有効期限が切れています。再送信してください。";
    }
    if (/token.*invalid|invalid.*token|otp/i.test(message)) {
      return "認証コードが正しくありません。6桁の数字を確認してください。";
    }
    if (/rate limit|too many/i.test(message)) {
      return "操作回数が多すぎます。しばらく待ってから再度お試しください。";
    }
    if (/already registered|already exists|duplicate/i.test(message)) {
      return "このメールアドレスはすでに登録されています。ログインしてください。";
    }
    return "処理に失敗しました。時間をおいて再度お試しください。";
  }

  function ensureConfigured(messageElement) {
    if (client) return true;
    showMessage(
      messageElement,
      "認証サービスが未設定です。supabase-config.jsに接続情報を設定してください。",
    );
    return false;
  }

  function showSignupStep(stepName) {
    const stepEntries = [
      ["email", elements.signupEmailStep, elements.progressEmail],
      ["code", elements.signupCodeStep, elements.progressCode],
      ["password", elements.signupPasswordStep, elements.progressPassword],
      ["profile", elements.signupProfileStep, elements.progressProfile],
    ];
    let reachedCurrent = false;
    stepEntries.forEach(([name, panel, indicator]) => {
      panel.hidden = name !== stepName;
      indicator.classList.toggle("active", name === stepName);
      indicator.classList.toggle("completed", !reachedCurrent && name !== stepName);
      if (name === stepName) reachedCurrent = true;
    });
  }

  function openLogin() {
    showScreen("login");
    showMessage(elements.loginMessage, "");
    if (!client) ensureConfigured(elements.loginMessage);
    elements.loginEmail.focus();
  }

  function openSignup() {
    showScreen("signup");
    showSignupStep("email");
    showMessage(elements.signupEmailMessage, "");
    if (!client) ensureConfigured(elements.signupEmailMessage);
    elements.signupEmail.focus();
  }

  async function updateAuthNavigation(user) {
    currentUser = user || null;
    window.quizApp.setAuthState(currentUser);
    elements.guestNav.hidden = Boolean(user);
    elements.userNav.hidden = !user;
    if (!user) {
      elements.navUserName.textContent = "";
      return;
    }
    elements.navUserName.textContent = user.email || "ログイン中";
    if (!client) return;
    const { data } = await client
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.name) elements.navUserName.textContent = data.name;
  }

  async function sendOtp(email) {
    return client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
  }

  function startResendCountdown() {
    if (resendTimerId) window.clearInterval(resendTimerId);
    let remaining = OTP_RESEND_SECONDS;
    elements.resendCodeButton.disabled = true;
    elements.resendCodeButton.textContent = `${remaining}秒後に再送信できます`;
    resendTimerId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(resendTimerId);
        resendTimerId = null;
        elements.resendCodeButton.disabled = false;
        elements.resendCodeButton.textContent = "認証コードを再送信";
        return;
      }
      elements.resendCodeButton.textContent = `${remaining}秒後に再送信できます`;
    }, 1000);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!ensureConfigured(elements.loginMessage)) return;
    const email = elements.loginEmail.value.trim().toLowerCase();
    const emailError = validateEmail(email);
    if (emailError) {
      showMessage(elements.loginMessage, emailError);
      return;
    }
    setBusy(elements.loginSubmitButton, true, "ログイン中...");
    showMessage(elements.loginMessage, "");
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: elements.loginPassword.value,
      });
      if (error) throw error;
      currentUser = data.user;
      elements.loginForm.reset();
      await updateAuthNavigation(currentUser);
      showScreen("start");
    } catch (error) {
      showMessage(elements.loginMessage, translateAuthError(error));
    } finally {
      setBusy(elements.loginSubmitButton, false);
    }
  }

  async function handleSendCode(event) {
    event.preventDefault();
    if (!ensureConfigured(elements.signupEmailMessage)) return;
    const email = elements.signupEmail.value.trim().toLowerCase();
    const validationMessage = validateEmail(email);
    if (validationMessage) {
      showMessage(elements.signupEmailMessage, validationMessage);
      return;
    }
    setBusy(elements.sendCodeButton, true, "送信中...");
    showMessage(elements.signupEmailMessage, "");
    try {
      const { error } = await sendOtp(email);
      if (error) throw error;
      signupEmailAddress = email;
      elements.codeEmailLabel.textContent = email;
      showSignupStep("code");
      startResendCountdown();
      elements.signupCode.focus();
    } catch (error) {
      showMessage(elements.signupEmailMessage, translateAuthError(error));
    } finally {
      setBusy(elements.sendCodeButton, false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    if (!ensureConfigured(elements.signupCodeMessage)) return;
    const token = elements.signupCode.value.replace(/\D/g, "");
    if (!/^\d{6}$/.test(token)) {
      showMessage(elements.signupCodeMessage, "6桁の認証コードを入力してください。");
      return;
    }
    setBusy(elements.verifyCodeButton, true, "確認中...");
    showMessage(elements.signupCodeMessage, "");
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: signupEmailAddress,
        token,
        type: "email",
      });
      if (error || !data.session || !data.user) throw error || new Error("No session");
      currentUser = data.user;
      const { data: existingProfile } = await client
        .from("profiles")
        .select("name, age")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (existingProfile?.name && existingProfile?.age) {
        await client.auth.signOut();
        signupSessionCreated = false;
        currentUser = null;
        await updateAuthNavigation(null);
        openLogin();
        showMessage(elements.loginMessage, "このメールアドレスは登録済みです。ログインしてください。");
        return;
      }
      signupSessionCreated = true;
      await updateAuthNavigation(currentUser);
      showSignupStep("password");
      elements.signupPassword.focus();
    } catch (error) {
      showMessage(elements.signupCodeMessage, translateAuthError(error));
    } finally {
      setBusy(elements.verifyCodeButton, false);
    }
  }

  async function handleResendCode() {
    if (!client || !signupEmailAddress || elements.resendCodeButton.disabled) return;
    elements.resendCodeButton.disabled = true;
    showMessage(elements.signupCodeMessage, "");
    try {
      const { error } = await sendOtp(signupEmailAddress);
      if (error) throw error;
      showMessage(elements.signupCodeMessage, "新しい認証コードを送信しました。", true);
      startResendCountdown();
    } catch (error) {
      elements.resendCodeButton.disabled = false;
      showMessage(elements.signupCodeMessage, translateAuthError(error));
    }
  }

  async function handleSetPassword(event) {
    event.preventDefault();
    if (!ensureConfigured(elements.signupPasswordMessage)) return;
    const password = elements.signupPassword.value;
    const validationMessage = validatePassword(password, elements.signupPasswordConfirm.value);
    if (validationMessage) {
      showMessage(elements.signupPasswordMessage, validationMessage);
      return;
    }
    setBusy(elements.setPasswordButton, true, "設定中...");
    showMessage(elements.signupPasswordMessage, "");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      elements.signupPasswordForm.reset();
      showSignupStep("profile");
      elements.signupName.focus();
    } catch (error) {
      showMessage(elements.signupPasswordMessage, translateAuthError(error));
    } finally {
      setBusy(elements.setPasswordButton, false);
    }
  }

  function getAvatarExtension(file) {
    return {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[file.type];
  }

  async function uploadAvatar(file, userId) {
    if (!file) return null;
    const extension = getAvatarExtension(file);
    const uniquePart = window.crypto?.randomUUID?.() || String(Date.now());
    const path = `${userId}/avatar-${uniquePart}.${extension}`;
    const { error } = await client.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async function updateProfileRecord(user, values, newAvatarPath) {
    const updateValues = {
      name: values.name,
      gender: values.gender,
      age: values.age,
      bio: values.bio,
    };
    if (newAvatarPath) updateValues.avatar_path = newAvatarPath;
    const { data, error } = await client
      .from("profiles")
      .update(updateValues)
      .eq("id", user.id)
      .select("id, email, name, gender, age, bio, avatar_path, email_verified")
      .single();
    if (error) throw error;
    return data;
  }

  async function handleCompleteSignup(event) {
    event.preventDefault();
    if (!ensureConfigured(elements.signupProfileMessage)) return;
    const values = {
      name: elements.signupName.value.trim(),
      gender: elements.signupGender.value,
      age: Number(elements.signupAge.value),
      bio: elements.signupBio.value.trim(),
    };
    const file = elements.signupAvatar.files[0] || null;
    const validationMessage = validateProfile(values.name, values.age, values.bio) || validateAvatar(file);
    if (validationMessage) {
      showMessage(elements.signupProfileMessage, validationMessage);
      return;
    }
    setBusy(elements.completeSignupButton, true, "登録中...");
    showMessage(elements.signupProfileMessage, "");
    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) throw userError || new Error("No user");
      const avatarPath = await uploadAvatar(file, userData.user.id);
      currentProfile = await updateProfileRecord(userData.user, values, avatarPath);
      currentUser = userData.user;
      signupSessionCreated = false;
      showMessage(elements.signupProfileMessage, "アカウントを作成しました。", true);
      await updateAuthNavigation(currentUser);
      window.setTimeout(() => showProfile(), 900);
    } catch (error) {
      showMessage(elements.signupProfileMessage, translateAuthError(error));
    } finally {
      setBusy(elements.completeSignupButton, false);
    }
  }

  async function renderStoredAvatar(path) {
    elements.profileAvatarImage.hidden = true;
    elements.profileAvatarPlaceholder.hidden = false;
    if (!path || !client) return;
    const { data, error } = await client.storage.from("avatars").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return;
    elements.profileAvatarImage.src = data.signedUrl;
    elements.profileAvatarImage.hidden = false;
    elements.profileAvatarPlaceholder.hidden = true;
  }

  async function showProfile() {
    if (!client) {
      openLogin();
      return;
    }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      await updateAuthNavigation(null);
      openLogin();
      showMessage(elements.loginMessage, "ログインしてください。");
      return;
    }
    currentUser = userData.user;
    showScreen("profile");
    showMessage(elements.profileMessage, "");
    setBusy(elements.saveProfileButton, true, "読込中...");
    try {
      const { data, error } = await client
        .from("profiles")
        .select("id, email, name, gender, age, bio, avatar_path, email_verified")
        .eq("id", currentUser.id)
        .single();
      if (error) throw error;
      currentProfile = data;
      elements.profileEmail.value = currentUser.email || data.email || "";
      elements.profileName.value = data.name || "";
      elements.profileGender.value = data.gender || "回答しない";
      elements.profileAge.value = data.age || "";
      elements.profileBio.value = data.bio || "";
      elements.profileAvatarFile.value = "";
      elements.profileAvatarPreview.hidden = true;
      await renderStoredAvatar(data.avatar_path);
    } catch (error) {
      showMessage(elements.profileMessage, "プロフィールを読み込めませんでした。設定を確認してください。");
    } finally {
      setBusy(elements.saveProfileButton, false);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!client || !currentUser) return;
    const email = elements.profileEmail.value.trim().toLowerCase();
    const values = {
      name: elements.profileName.value.trim(),
      gender: elements.profileGender.value,
      age: Number(elements.profileAge.value),
      bio: elements.profileBio.value.trim(),
    };
    const file = elements.profileAvatarFile.files[0] || null;
    const validationMessage =
      validateEmail(email)
      || validateProfile(values.name, values.age, values.bio)
      || validateAvatar(file);
    if (validationMessage) {
      showMessage(elements.profileMessage, validationMessage);
      return;
    }
    setBusy(elements.saveProfileButton, true, "保存中...");
    showMessage(elements.profileMessage, "");
    try {
      let emailChanged = false;
      if (email !== String(currentUser.email || "").toLowerCase()) {
        const { error: emailError } = await client.auth.updateUser({ email });
        if (emailError) throw emailError;
        emailChanged = true;
      }
      const oldAvatarPath = currentProfile?.avatar_path || null;
      const avatarPath = await uploadAvatar(file, currentUser.id);
      currentProfile = await updateProfileRecord(currentUser, values, avatarPath);
      if (avatarPath && oldAvatarPath && oldAvatarPath !== avatarPath) {
        await client.storage.from("avatars").remove([oldAvatarPath]);
      }
      await updateAuthNavigation(currentUser);
      await renderStoredAvatar(currentProfile.avatar_path);
      elements.profileAvatarFile.value = "";
      elements.profileAvatarPreview.hidden = true;
      showMessage(
        elements.profileMessage,
        emailChanged
          ? "プロフィールを保存しました。新しいメールアドレスの確認メールをご確認ください。"
          : "プロフィールを保存しました。",
        true,
      );
    } catch (error) {
      showMessage(elements.profileMessage, translateAuthError(error));
    } finally {
      setBusy(elements.saveProfileButton, false);
    }
  }

  async function logout() {
    if (client) await client.auth.signOut();
    currentUser = null;
    currentProfile = null;
    await updateAuthNavigation(null);
    openLogin();
  }

  async function cancelSignup(destination) {
    if (client && signupSessionCreated) await client.auth.signOut();
    signupSessionCreated = false;
    signupEmailAddress = "";
    currentUser = null;
    await updateAuthNavigation(null);
    if (destination === "login") openLogin();
    else openLogin();
  }

  function previewAvatar(input, preview) {
    const file = input.files[0] || null;
    const error = validateAvatar(file);
    const messageElement =
      input === elements.signupAvatar
        ? elements.signupProfileMessage
        : elements.profileMessage;
    if (error) {
      input.value = "";
      preview.hidden = true;
      showMessage(messageElement, error);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      preview.hidden = true;
      return;
    }
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
    showMessage(messageElement, "");
  }

  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordTarget);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "隠す" : "表示";
    });
  });

  elements.navLoginButton.addEventListener("click", openLogin);
  elements.navSignupButton.addEventListener("click", openSignup);
  elements.navProfileButton.addEventListener("click", showProfile);
  elements.navLogoutButton.addEventListener("click", logout);
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.loginToSignupButton.addEventListener("click", openSignup);
  elements.loginHomeButton.addEventListener("click", () => showScreen("start"));
  elements.signupEmailForm.addEventListener("submit", handleSendCode);
  elements.signupCodeForm.addEventListener("submit", handleVerifyCode);
  elements.resendCodeButton.addEventListener("click", handleResendCode);
  elements.signupPasswordForm.addEventListener("submit", handleSetPassword);
  elements.signupProfileForm.addEventListener("submit", handleCompleteSignup);
  elements.signupToLoginButton.addEventListener("click", () => cancelSignup("login"));
  elements.signupHomeButton.addEventListener("click", () => cancelSignup("start"));
  elements.signupAvatar.addEventListener("change", () =>
    previewAvatar(elements.signupAvatar, elements.signupAvatarPreview));
  elements.profileAvatarFile.addEventListener("change", () =>
    previewAvatar(elements.profileAvatarFile, elements.profileAvatarPreview));
  elements.profileForm.addEventListener("submit", handleSaveProfile);
  elements.profileHomeButton.addEventListener("click", () => showScreen("start"));
  elements.profileLogoutButton.addEventListener("click", logout);

  if (client) {
    client.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return updateAuthNavigation(data.session?.user || null);
      })
      .catch(() => updateAuthNavigation(null));
    client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => updateAuthNavigation(session?.user || null), 0);
    });
  } else {
    updateAuthNavigation(null);
  }
})();
