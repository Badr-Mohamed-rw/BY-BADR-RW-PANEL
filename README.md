# By Badr - Node.js

Проект переписан с PHP на Node.js + HTML.
Совместим с **Node.js 13+**.

## Установка

1. Установи Node.js 13 или новее - https://nodejs.org
2. Положи папку `Image` (и `Images`, `Fonts`, если есть) рядом с server.js
3. Установи зависимости:

    npm install

4. Запусти сервер:

    npm start

5. Открой http://localhost:3000

## Windows

Дважды кликни start.bat - он сам всё поставит и запустит.

## Linux / macOS

    chmod +x start.sh
    ./start.sh

## Структура

    server.js          - Node.js сервер (API + статика)
    package.json       - зависимости
    index.html         - главная
    shop.html          - магазин
    panel.html         - вход / регистрация / личный кабинет
    order.html         - форма заказа лаунчера
    admin.html         - админка (только для админа)
    changelog.html     - обновления
    privacy.html       - политика конфиденциальности
    panel.css          - общие стили
    api.js             - клиент для запросов к /api/*
    cookie-banner.js   - баннер cookie
    visual.js          - частицы, звуки, анимации
    Image/             - картинки (твои)
    Images/            - логотип и фон (твои)
    Fonts/             - шрифты (твои)
    data/              - JSON база (создаётся автоматически)
    uploads/           - загрузки (создаётся автоматически)

## API

Все запросы идут на /api/<action> - POST (form-data) или GET, как в старом api.php.

- register               POST  гость
- login                  POST  гость
- logout                 GET   гость
- cookie-consent         POST  гость
- me                     GET   гость
- order                  POST  авторизован
- my-orders              GET   авторизован
- all-orders             GET   админ
- stats                  GET   все
- approve                POST  админ
- mark-sent              POST  админ
- reject                 POST  админ
- get-reviews            GET   все
- add-review             POST  все
- admin-approve-review   POST  админ
- admin-delete-review    POST  админ

## Админ

Логин под email ahmedesmail7978@gmail.com даёт доступ к /admin.html

## Заметки

- Пароли хранятся как bcrypt-хеши (bcryptjs)
- Сессия - 30 дней через express-session
- Все данные в JSON-файлах (data/)
- Файлы server.js, package.json, node_modules, data, uploads недоступны через HTTP
