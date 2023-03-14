document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#login-form");
  const submitBtn = document.querySelector("#submit-btn");
  const showPassword = document.querySelector("#show-password");

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
        alert(data.message);
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
