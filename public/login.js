if (getToken()) {
  window.location.replace("profile");
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#login-form");
  const submitBtn = document.querySelector("#submit-btn");
  const showPassword = document.querySelector("#show-password");
  const rememberMe = document.querySelector("#remember");

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

  form.addEventListener("submit", login);
  async function login(e) {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = "Logging in...";
    const formData = {
      username: form.querySelector("#username").value,
      password: form.querySelector("#password").value,
    };

    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          return data;
        }
        alert(data.message);
      })
      .then((data) => {
        if (rememberMe.checked) {
          const d = new Date();
          d.setTime(d.getTime() + 600 * 24 * 60 * 60 * 1000);
          document.cookie = `jsnId=${
            data.message
          }; SameSite=Lax; Secure; expires=${d.toUTCString()}`;
        } else {
          document.cookie = `jsnId=${data.message}; SameSite=Lax; Secure`;
        }
        window.location.replace("profile");
      })
      .catch(() => {
        alert("Error logging in!");
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = "Login";
      });
  }
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
