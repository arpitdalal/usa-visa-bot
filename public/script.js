document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#signup-form");
  const submitBtn = document.querySelector("#submit-btn");
  const showPassword = document.querySelector("#show-password");
  const modal = document.querySelector("#modal");
  const body = document.querySelector("body");
  const date = form.querySelector("#date");

  if (!localStorage.getItem("understand")) {
    modal.classList.add("show");
    modal.style = "display: block";
    body.innerHTML +=
      '<div id="modal-backdrop" class="modal-backdrop fade show"></div>';
    body.classList.add("modal-open");
    body.style = "overflow: hidden; padding-right: 12px";

    const understandBtn = document.querySelector("#understand-btn");
    understandBtn.addEventListener("click", () => {
      document.querySelector("#modal").classList.remove("show");
      document.querySelector("#modal").style = "display: none;";
      document.querySelector("#modal-backdrop").remove();
      body.classList.remove("modal-open");
      body.style = "";
      localStorage.setItem("understand", "true");
    });
  }

  const today = new Date();
  let dd = today.getDate() + 1;
  let mm = today.getMonth() + 1; //January is 0 so need to add 1 to make it 1!
  let yyyy = today.getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }

  const tomorrow = yyyy + "-" + mm + "-" + dd;
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (
      confirm(
        "Please check the login email and password for USA website is correct",
      )
    ) {
      if (date.value < tomorrow) {
        alert("Your selected date is in the past. Please select a future date");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = "Submitting...";
      const formData = {
        username: form.querySelector("#username").value,
        password: form.querySelector("#password").value,
        email: form.querySelector("#email").value,
        date: date.value || null,
      };

      fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((res) => res.json())
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
  });
});
