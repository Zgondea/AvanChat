# 🏛️ Municipality Demo Site

Site demonstrativ pentru Primăria Municipiului București cu widget-ul de chat fiscal integrat.

## 🌐 Acces Site Demo

**URL**: http://localhost/demo/

## ✨ Caracteristici

### 📱 **Design Responsiv**
- Adaptat pentru desktop, tablet și mobile
- Layout modern și profesional
- Animații și efecte vizuale plăcute

### 🎨 **Secțiuni Complete**
- **Header** - Logo, navigație, link admin
- **Hero** - Prezentare cu statistici
- **Servicii** - 4 categorii principale de servicii publice
- **Documente** - Documente importante descărcabile
- **Știri** - Anunțuri și noutăți
- **Contact** - Informații complete de contact
- **Footer** - Link-uri utile și social media

### 💬 **Chat Widget Integrat**
- Widget funcțional în colțul din dreapta jos
- Configurat specific pentru PMB (pmb.ro)
- Stilizat cu culorile primăriei (#1976d2)
- 6 categorii de întrebări disponibile

## 🛠️ Tehnologii Utilizate

- **HTML5** - Structură semantică
- **CSS3** - Design modern cu Grid și Flexbox
- **JavaScript** - Funcționalități interactive
- **Font Awesome** - Iconuri profesionale
- **Chat Widget** - Integrat din widget/working-chat-widget.js

## 🎯 Utilizare pentru Prezentări

### **Demonstrații Live:**
1. **Servicii Publice** - Arată varietatea de servicii
2. **Chat Fiscal** - Demonstrează asistentul AI
3. **Design Professional** - Aspect modern și atractiv
4. **Responsiv** - Funcționează pe toate dispozitivele

### **Scenarii Demo:**
- Prezentări către primării
- Demo-uri pentru clienți potențiali  
- Teste de funcționalitate
- Training pentru utilizatori

## 📊 Configurația Widget-ului

```javascript
const widget = new ChatLegislativWidget({
    apiUrl: 'http://localhost/api/v1',
    municipalityDomain: 'pmb.ro',
    title: 'Asistent Fiscal PMB',
    welcomeMessage: 'Bună ziua! Sunt asistentul virtual al Primăriei...',
    primaryColor: '#1976d2'
});
```

## 🔧 Personalizare

### **Culori Principale:**
- Albastru Principal: `#1976d2`
- Albastru Secundar: `#42a5f5`
- Fundal: `#f8f9fa`

### **Pentru Alte Primării:**
1. Schimbă logo-ul și denumirea
2. Actualizează domeniul în widget (`municipalityDomain`)
3. Modifică datele de contact
4. Personalizează culorile dacă e necesar

## 📁 Structura Fișierelor

```
municipality-demo/
├── index.html          # Pagina principală
├── styles.css          # Stilurile CSS
└── README.md           # Documentația
```

## 🚀 Deployment

Site-ul este servit automat de nginx la `/demo/` când rulezi docker-compose.

### **URL-uri Disponibile:**
- Site Demo: `http://localhost/demo/`
- Chat Widget: `http://localhost/widget/`
- Admin Panel: `http://localhost/admin`
- API: `http://localhost/api/v1`

## 📱 Mobile-First Design

Site-ul este optimizat pentru toate dimensiunile de ecran:
- **Mobile**: < 480px
- **Tablet**: 480px - 768px  
- **Desktop**: > 768px

## 🎨 Preview Secțiuni

- ✅ Header cu navigație
- ✅ Hero section cu statistici
- ✅ Servicii publice (4 carduri)
- ✅ Documente (3 categorii)
- ✅ Știri și anunțuri (3 articole)
- ✅ Contact și hartă
- ✅ Footer complet
- ✅ Chat widget funcțional

## 💡 Tips pentru Demo

1. **Începe cu homepage-ul** - arată designul general
2. **Demonstrează widget-ul** - testează o întrebare despre TVA
3. **Arată responsivitatea** - redimensionează browserul
4. **Link către admin** - demonstrează panoul de administrare
5. **Explică integrarea** - cum se poate folosi pe site-uri reale

Perfect pentru prezentări și demonstrații live! 🎉