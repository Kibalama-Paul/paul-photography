<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $to = "kibalamapaul70@gmail.com";
    $name = htmlspecialchars($_POST["name"]);
    $email = filter_var($_POST["email"], FILTER_VALIDATE_EMAIL);
    $message = htmlspecialchars($_POST["message"]);

    if ($email && !empty($name) && !empty($message)) {
        $subject = "New Contact Message from $name";
        $headers = "From: $email\r\n";
        $headers .= "Reply-To: $email\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        $fullMessage = "You received a new message:\n\nName: $name\nEmail: $email\n\nMessage:\n$message";

        if (mail($to, $subject, $fullMessage, $headers)) {
            header("Location: contact.html?status=success");
            exit();
        }
    }

    header("Location: contact.html?status=error");
    exit();
}
?>
