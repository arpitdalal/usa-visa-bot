if (!getToken()) {
  window.location.replace("login");
}

document.addEventListener("DOMContentLoaded", function () {
  const nameDiv = document.querySelector("#name");
  const usernameInput = document.querySelector("#username");
  const passwordInput = document.querySelector("#password");
  const showPassword = document.querySelector("#show-password");
  const emailInput = document.querySelector("#email");
  const dateInput = document.querySelector("#date");
  const logoutBtn = document.querySelector("#logout");

  const token = getToken();
  const user = JSON.parse(token);
  nameDiv.innerHTML = `Hello <em>${user.username}</em>`;
  usernameInput.value = user.username;
  passwordInput.value = user.password;
  emailInput.value = user.email;
  dateInput.value = user.date;

  logoutBtn.addEventListener("click", () => {
    const d = new Date();
    d.setTime(d.getTime() - 2 * 24 * 60 * 60 * 1000);
    document.cookie = `jsnId=${token}; SameSite=Lax; Secure; expires=${d.toUTCString()}`;
    location.reload();
  });

  showPassword.addEventListener("click", () => {
    const password = document.querySelector("#password");
    if (password.type === "password") {
      password.type = "text";
      showPassword.innerText = "Hide password";
    } else {
      password.type = "password";
      showPassword.innerText = "Show password";
    }
  });
});

function getToken() {
  var cookies = document.cookie;
  var parts = cookies.split("jsnId" + "=");
  var cookieValue = "";
  if (parts.length == 2) {
    cookieValue = parts.pop().split(";").shift();
  }
  return cookieValue;
}
