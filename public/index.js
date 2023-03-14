document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#signup-form");
  const submitBtn = document.querySelector("#submit-btn");
  const showPassword = document.querySelector("#show-password");
  const modal = document.querySelector("#modal");
  const modalBackdrop = document.querySelector("#modal-backdrop");
  const body = document.querySelector("body");
  const date = form.querySelector("#date");

  modal.classList.add("show");
  modal.style = "display: block";
  modalBackdrop.classList.remove("d-none");
  modalBackdrop.classList.add("show");
  body.classList.add("modal-open");
  body.style = "overflow: hidden; padding-right: 12px";

  const understandBtn = document.querySelector("#understand-btn");
  understandBtn.addEventListener("click", () => {
    document.querySelector("#modal").classList.remove("show");
    document.querySelector("#modal").style = "display: none;";
    modalBackdrop.classList.remove("show");
    modalBackdrop.classList.add("d-none");
    body.classList.remove("modal-open");
    body.style = "";
  });

  const today = new Date().toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  let dd = new Date(today).getDate() + 1;
  let mm = new Date(today).getMonth() + 1;
  let yyyy = new Date(today).getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }

  const tomorrow = `${yyyy}-${mm}-${dd}`;
  date.setAttribute("min", tomorrow);

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

  form.addEventListener("submit", signup);

  async function signup(e) {
    e.preventDefault();
    if (
      confirm(
        "Please confirm if the login email and password for USA website are correct",
      )
    ) {
      // if (date.value < tomorrow) {
      //   alert("Error: Please select a future desired date");
      //   return;
      // }

      submitBtn.disabled = true;
      submitBtn.innerText = "Submitting...";
      const formData = {
        username: form.querySelector("#username").value,
        password: form.querySelector("#password").value,
        email: form.querySelector("#email").value,
        date: date.value,
      };

      fetch("/signup", {
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
          alert("Error signing up!");
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.innerText = "Submit";
        });
    }
  }
});
