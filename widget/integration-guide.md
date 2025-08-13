# 🔗 Ghid de Integrare - Chat Widget Legislativ

Acest ghid vă va ajuta să integrați widget-ul Chat Legislativ pe site-ul primăriei dumneavoastră.

## 🚀 Integrare Rapidă (2 minute)

### Pasul 1: Adăugați CSS-ul în `<head>`

```html
<link rel="stylesheet" href="https://your-domain.com/widget/fiscal-chat-widget.css">
```

### Pasul 2: Adăugați JavaScript-ul înainte de `</body>`

```html
<script 
    src="https://your-domain.com/widget/fiscal-chat-widget.js"
    data-chat-legislativ
    data-municipality-domain="primaria-bucuresti.ro"
    data-api-url="https://api.chatlegislativ.ro/api/v1"
    data-title="Asistent Fiscal București"
></script>
```

### Pasul 3: Personalizați pentru primăria dvs.

Înlocuiți următorii parametri:
- `data-municipality-domain`: Domeniul site-ului primăriei
- `data-title`: Numele afișat în chat
- `data-api-url`: URL-ul API-ului (primit de la furnizor)

## ⚙️ Configurare Avansată

### Toate Opțiunile Disponibile

```html
<script 
    src="https://your-domain.com/widget/fiscal-chat-widget.js"
    data-chat-legislativ
    data-municipality-domain="primaria-exemple.ro"
    data-municipality-id="uuid-optional"
    data-api-url="https://api.chatlegislativ.ro/api/v1"
    data-title="Asistent Fiscal Primăria Exemple"
    data-welcome-message="Bună ziua! Vă pot ajuta cu întrebări despre taxele și impozitele locale."
    data-primary-color="#2196F3"
></script>
```

### Configurare prin JavaScript

```javascript
// Configurare programatică
const chatWidget = window.ChatLegislativWidget.init({
    apiUrl: 'https://api.chatlegislativ.ro/api/v1',
    municipalityDomain: 'primaria-exemple.ro',
    // sau municipalityId: 'uuid-specific-primarie',
    title: 'Asistent Fiscal Personalizat',
    welcomeMessage: 'Mesaj de bun venit personalizat!',
    primaryColor: '#1976d2',
    placeholder: 'Scrieți întrebarea dvs. aici...',
    enableSources: true,
    enableTyping: true
});
```

## 🎨 Personalizare Vizuală

### Culori Personalizate

```html
<script 
    data-primary-color="#E91E63"    <!-- Culoarea principală -->
    <!-- ... alte opțiuni ... -->
></script>
```

### CSS Personalizat

```css
/* Personalizează widget-ul */
.chat-legislativ-widget {
    --primary-color: #your-color;
    --secondary-color: #your-secondary-color;
}

/* Schimbă poziția */
.chat-legislativ-button {
    bottom: 30px !important;
    right: 30px !important;
}

/* Personalizează dimensiunea pe mobile */
@media (max-width: 768px) {
    .chat-legislativ-container {
        width: calc(100vw - 20px) !important;
        height: calc(100vh - 100px) !important;
    }
}
```

## 📋 Opțiuni de Configurare Complete

| Parametru | Tip | Descriere | Default |
|-----------|-----|-----------|---------|
| `apiUrl` | string | URL-ul API-ului backend | `http://localhost:8000/api/v1` |
| `municipalityDomain` | string | Domeniul primăriei | `window.location.hostname` |
| `municipalityId` | string | ID specific primărie (opțional) | `null` |
| `title` | string | Titlul afișat în header | `Asistent Legislativ` |
| `welcomeMessage` | string | Mesajul de bun venit | Mesaj standard |
| `placeholder` | string | Placeholder pentru input | `Scrieți întrebarea...` |
| `primaryColor` | string | Culoarea principală (hex) | `#1976d2` |
| `position` | string | Poziția pe pagină | `bottom-right` |
| `enableSources` | boolean | Afișează sursele răspunsurilor | `true` |
| `enableTyping` | boolean | Indicator de typing | `true` |

## 🔧 API JavaScript

### Metode Disponibile

```javascript
// Inițializare
const widget = window.ChatLegislativWidget.init(config);

// Obține instanța curentă
const widget = window.ChatLegislativWidget.getInstance();

// Deschide chat-ul programatic
widget.open();

// Închide chat-ul programatic
widget.close();

// Actualizează configurația
widget.updateConfig({
    primaryColor: '#new-color'
});

// Distruge widget-ul
window.ChatLegislativWidget.destroy();
```

### Evenimente Personalizate

```javascript
// Ascultă evenimentele chat-ului
document.addEventListener('chatWidgetOpen', function() {
    console.log('Chat-ul s-a deschis');
});

document.addEventListener('chatWidgetClose', function() {
    console.log('Chat-ul s-a închis');
});

document.addEventListener('chatMessage', function(event) {
    console.log('Mesaj nou:', event.detail);
});
```

## 🛠️ Exemple de Implementare

### WordPress

```php
// În functions.php
function add_chat_widget() {
    ?>
    <link rel="stylesheet" href="https://api.chatlegislativ.ro/widget/fiscal-chat-widget.css">
    <script 
        src="https://api.chatlegislativ.ro/widget/fiscal-chat-widget.js"
        data-chat-legislativ
        data-municipality-domain="<?php echo $_SERVER['HTTP_HOST']; ?>"
        data-title="Asistent Fiscal <?php bloginfo('name'); ?>"
    ></script>
    <?php
}
add_action('wp_footer', 'add_chat_widget');
```

### Joomla

```php
// În template-ul principal
$document = JFactory::getDocument();
$document->addStyleSheet('https://api.chatlegislativ.ro/widget/fiscal-chat-widget.css');

// Înainte de </body>
echo '<script 
    src="https://api.chatlegislativ.ro/widget/fiscal-chat-widget.js"
    data-chat-legislativ
    data-municipality-domain="' . $_SERVER['HTTP_HOST'] . '"
></script>';
```

### Drupal

```php
// În modulul personalizat
function your_module_page_attachments(array &$attachments) {
    $attachments['#attached']['library'][] = 'your_module/chat_widget';
}

// În your_module.libraries.yml
chat_widget:
  css:
    theme:
      https://api.chatlegislativ.ro/widget/fiscal-chat-widget.css: {}
  js:
    https://api.chatlegislativ.ro/widget/fiscal-chat-widget.js: {}
```

## 🔒 Securitate și Privacy

### Politica de Confidențialitate

Widget-ul respectă GDPR și colectează minimal:
- IP-ul utilizatorului (pentru rate limiting)
- User-Agent (pentru compatibilitate)
- Mesajele conversației (pentru îmbunătățire)

### Setări de Securitate

```javascript
// Configurare pentru producție
const widget = window.ChatLegislativWidget.init({
    apiUrl: 'https://secure-api.chatlegislativ.ro/api/v1',
    // Folosește HTTPS în producție
    enableAnalytics: false, // Dezactivează analytics dacă e necesar
    respectDoNotTrack: true, // Respectă setările Do Not Track
});
```

## 📱 Responsiveness și Accesibilitate

Widget-ul este:
- ✅ **Responsive**: Funcționează pe toate dispozitivele
- ✅ **Accesibil**: Compatibil cu screen readers
- ✅ **Keyboard Navigation**: Suportă navigarea cu tastatura
- ✅ **High Contrast**: Vizibil în modul high contrast
- ✅ **RTL Support**: Suportă limbi RTL

### Testare Accesibilitate

```javascript
// Testează cu tastatura
// Tab - navigare între elemente
// Enter/Space - deschide chat
// Escape - închide chat
// Tab în chat - navighează prin elementele chat-ului
```

## 🚨 Troubleshooting

### Probleme Comune

#### Widget-ul nu se încarcă
1. Verifică că URL-urile CSS și JS sunt corecte
2. Verifică consola browser pentru erori
3. Asigură-te că nu există conflicte CSS

#### API nu răspunde
1. Verifică `data-api-url`
2. Testează endpoint-ul: `GET /health`
3. Verifică setările CORS

#### Chat-ul nu primește răspunsuri
1. Verifică că primăria este configurată în admin
2. Asigură-te că sunt documente procesate
3. Verifică logs-urile serverului

### Depanare

```javascript
// Activează modul debug
window.ChatLegislativWidget.init({
    debug: true, // Afișează logs în consolă
    // ... alte opțiuni
});

// Verifică starea widget-ului
const widget = window.ChatLegislativWidget.getInstance();
console.log(widget.getStatus());
```

## 📞 Suport

### Contacte

- 📧 **Email**: support@chatlegislativ.ro
- 📱 **Telefon**: +40 XXX XXX XXX
- 💬 **Chat**: Folosiți widget-ul pe site-ul nostru
- 🎫 **Tickets**: [Portal de suport](https://support.chatlegislativ.ro)

### Documentație Suplimentară

- [API Documentation](https://docs.chatlegislativ.ro/api)
- [Admin Panel Guide](https://docs.chatlegislativ.ro/admin)
- [FAQ](https://docs.chatlegislativ.ro/faq)

---

**Chat Legislativ** - Modernizăm serviciile publice prin inteligența artificială 🤖🏛️