var MySessionID = Cookies.get("SID");
var MyUserID;
var MyUsername;
function SetLoginStatus() {
	if (MySessionID) {
		$('.only-when-logged-in').removeClass('is-hidden');
		$('.only-when-logged-out').addClass('is-hidden');
	}
	else {
		$('.only-when-logged-in').addClass('is-hidden');
		$('.only-when-logged-out').removeClass('is-hidden');
	}
}
$(SetLoginStatus);
function API(URL, Data, Callback) {
	$.ajax({
		url: "/API/" + URL,
		method: "POST",
		headers: { Authorization: MySessionID },
		contentType: 'application/json',
		data: JSON.stringify(Data),
		processData: false,
		success: function (data, status, obj) {
			if (obj.getResponseHeader("Authorization")) {
				MySessionID = obj.getResponseHeader("Authorization");
				Cookies.set("SID", MySessionID);
				SetLoginStatus();
			} else {
				Cookies.remove("SID");
				MySessionID = false;
				SetLoginStatus();
			}
			if (MySessionID) {
				MyUserID = obj.getResponseHeader("UserID");
				MyUsername = obj.getResponseHeader("Username");
			} else {
				MyUserID = false;
				MyUsername = false;
			}
			Callback(data);
		},
		error: function (jqXhr) {
			if (jqXhr.status == 403) {
				Cookies.remove("SID");
				ShowLogin(URL, Data, Callback);
			}
			else
				ShowError("Error connecting to server.");
		}
	});
}

function ShowError(ErrorText, Callback) {
	var Dialog = $('<DIV>').addClass('modal');
	$('<DIV>').addClass('modal-background').appendTo(Dialog).click(() => {
		Dialog.remove();
		if (Callback)
			Callback();
	});
	var ContentHolder = $('<DIV>').addClass('modal-content').appendTo(Dialog);
	var Content = $('<DIV>').addClass('box').appendTo(ContentHolder);
	$('<BUTTON>').addClass('modal-close is-large').appendTo(Dialog).click(() => {
		Dialog.remove();
		if (Callback)
			Callback();
	});

	Content.text(ErrorText);
	Dialog.appendTo($('body')).addClass("is-active");
}

function ShowLogin(URL, Data, Callback) {
	var Dialog = $('<DIV>').addClass('modal');
	$('<DIV>').addClass('modal-background').appendTo(Dialog);
	var DialogCard = $('<DIV>').addClass('modal-card').appendTo(Dialog);
	Dialog.appendTo($('body')).addClass("is-active");

	var Heading = $('<HEADER>').addClass('modal-card-head').appendTo(DialogCard);
	$('<P>').addClass('modal-card-title').appendTo(Heading).text("Login Required");
	$('<BUTTON>').addClass('delete').appendTo(Heading).click(() => { window.history.back(); });

	var Body = $('<SECTION>').addClass('modal-card-body').appendTo(DialogCard);
	var Form = $('<FORM>').addClass('content').appendTo(Body);

	var Error = $('<DIV>').appendTo(Form).hide()
		.addClass('title has-text-danger');
		var ErrorIcon = $('<SPAN>').addClass('icon').appendTo(Error);
			$('<I>').addClass('fas fa-exclamation-triangle').appendTo(ErrorIcon);
		$('<SPAN>').text(" ").appendTo(Error);
		var ErrorText = $('<SPAN>').appendTo(Error);

	var UsernameField = $('<DIV>').addClass('field is-horizontal').appendTo(Form);
		var UsernameLabel = $('<DIV>').addClass('field-label is-normal').appendTo(UsernameField);
			$('<LABEL>').addClass('label').appendTo(UsernameLabel).text("Username");
		var UsernameContent = $('<DIV>').addClass('field-body').appendTo(UsernameField);
			var UsernameControl = $('<DIV>').addClass('field control has-icons-left has-icons-right').appendTo(UsernameContent);
				var Username = $('<INPUT>').addClass('input').prop('placeholder', 'Username').appendTo(UsernameControl);
				var UsernameIcon = $('<SPAN>').addClass('icon is-small is-left').appendTo(UsernameControl);
					$('<I>').addClass('fas fa-user').appendTo(UsernameIcon);

	var PasswordField = $('<DIV>').addClass('field is-horizontal').appendTo(Form);
		var PasswordLabel = $('<DIV>').addClass('field-label is-normal').appendTo(PasswordField);
			$('<LABEL>').addClass('label').appendTo(PasswordLabel).text("Password");
		var PasswordContent = $('<DIV>').addClass('field-body').appendTo(PasswordField);
			var PasswordControl = $('<DIV>').addClass('field control has-icons-left has-icons-right').appendTo(PasswordContent);
				var Password = $('<INPUT>').addClass('input').prop('type', 'password').prop('placeholder', 'Password').appendTo(PasswordControl);
				var PasswordIcon = $('<SPAN>').addClass('icon is-small is-left').appendTo(PasswordControl);
					$('<I>').addClass('fas fa-key').appendTo(PasswordIcon);

	var Footer = $('<FOOTER>').addClass('modal-card-foot').appendTo(DialogCard);
		var Buttons = $('<NAV>').addClass('level').appendTo(Footer).width("100%");
			var ButtonsLeft = $('<DIV>').addClass('level-left').appendTo(Buttons);
				var SignupButton = $('<BUTTON>').addClass('level-item button').appendTo(ButtonsLeft).text("Register Account").click(() => {
					location.href = "/account/create.html";
				});
				var ForgotPasswordButton = $('<BUTTON>').addClass('level-item button').appendTo(ButtonsLeft).text("Forgotten Username/Password").click(() => {
					location.href = "/account/forgot.html";
				});
			var ButtonsRight = $('<DIV>').addClass('level-right').appendTo(Buttons);
				var LoginButton = $('<BUTTON>').addClass('level-item button is-success').appendTo(ButtonsRight).text("Log In").click(() => {
					$.ajax({
						url: "/API/auth/login",
						method: "POST",
						contentType: 'application/json',
						data: JSON.stringify({
							Username: Username.val(),
							Password: Password.val(),
						}),
						processData: false,
						success: function (data, status, obj) {
							if (data.Error) {
								ErrorText.text(data.Error);
								Error.show();
							}
							if (data.OK) {
								MySessionID = obj.getResponseHeader("Authorization");
								Cookies.set("SID", MySessionID);
								Dialog.remove();
								SetLoginStatus();
								API(URL, Data, Callback);
							}
						},
						error: function (jqXhr) {
							ErrorText.text("Error connecting to server.");
							Error.show();
						}
					});
				});
}