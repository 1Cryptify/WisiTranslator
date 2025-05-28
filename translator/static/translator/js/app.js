document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('translationForm');
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const loading = document.getElementById('loading');
    const charCount = document.getElementById('charCount');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const swapBtn = document.getElementById('swapLanguages');
    const detectedLangDisplay = document.getElementById('detectedLang');

    let isTranslating = false;
    let timeoutId;

    // Fonction de détection de langue
    function detectLanguage(text) {
        if (text.length < 3) return;

        fetch('/detect/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({text: text})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && detectedLangDisplay) {
                detectedLangDisplay.textContent = `Langue détectée: ${data.language_name}`;
                detectedLangDisplay.style.display = 'block';
            }
        })
        .catch(error => console.error('Erreur de détection:', error));
    }

    // Fonction de traduction
    function translateText(isAutoTranslate = false) {
        const text = sourceText.value.trim();
        
        if (isAutoTranslate && text.length < 5) {
            return;
        }
        
        if (!isAutoTranslate && !text) {
            showAlert('Veuillez saisir un texte à traduire.', 'warning');
            return;
        }

        if (isTranslating) {
            return;
        }

        isTranslating = true;

        const data = {
            text: text,
            source_lang: sourceLanguage.value,
            target_lang: targetLanguage.value
        };

        loading.style.display = 'block';
        if (!isAutoTranslate) {
            translatedText.value = '';
        }
        copyBtn.disabled = true;

        fetch('/translate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            loading.style.display = 'none';
            isTranslating = false;
            
            if (data.success) {
                translatedText.value = data.translated_text;
                translatedText.classList.add('fade-in');
                copyBtn.disabled = false;
                
                // Afficher un message si même langue
                if (data.message) {
                    showAlert(data.message, 'info');
                }
                
                setTimeout(() => {
                    translatedText.classList.remove('fade-in');
                }, 500);
            } else {
                if (!isAutoTranslate) {
                    showAlert('Erreur: ' + (data.error || 'Erreur de traduction'), 'danger');
                }
                console.error('Erreur de traduction:', data.error);
            }
        })
        .catch(error => {
            loading.style.display = 'none';
            isTranslating = false;
            console.error('Erreur:', error);
            if (!isAutoTranslate) {
                showAlert('Erreur de connexion. Veuillez réessayer.', 'danger');
            }
        });
    }

    // Fonction pour afficher des alertes
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.card-body');
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Fonction pour obtenir le token CSRF
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Compteur de caractères et détection de langue
    sourceText.addEventListener('input', function() {
        charCount.textContent = this.value.length;
        
        // Détection de langue si "auto" est sélectionné
        if (sourceLanguage.value === 'auto' && this.value.trim().length > 10) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                detectLanguage(this.value);
            }, 1000);
        }
    });

    // Effacer les textes
    clearBtn.addEventListener('click', function() {
        sourceText.value = '';
        translatedText.value = '';
        charCount.textContent = '0';
        copyBtn.disabled = true;
        clearTimeout(timeoutId);
        if (detectedLangDisplay) {
            detectedLangDisplay.style.display = 'none';
        }
    });

    // Copier le texte traduit
    copyBtn.addEventListener('click', function() {
        if (translatedText.value) {
            navigator.clipboard.writeText(translatedText.value).then(function() {
                // Animation de succès
                const originalText = copyBtn.innerHTML;
                const originalClass = copyBtn.className;
                
                copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copié!';
                copyBtn.className = copyBtn.className.replace('btn-outline-secondary', 'btn-success');
                
                setTimeout(function() {
                    copyBtn.innerHTML = originalText;
                    copyBtn.className = originalClass;
                }, 2000);
            }).catch(function() {
                // Fallback pour les navigateurs plus anciens
                translatedText.select();
                document.execCommand('copy');
                showAlert('Texte copié dans le presse-papiers', 'success');
            });
        }
    });

    // Échanger les langues
    swapBtn.addEventListener('click', function() {
        const sourceValue = sourceLanguage.value;
        const targetValue = targetLanguage.value;
        
        if (sourceValue !== 'auto') {
            sourceLanguage.value = targetValue;
            targetLanguage.value = sourceValue;
            
            // Échanger aussi les textes
            const sourceTextValue = sourceText.value;
            const translatedTextValue = translatedText.value;
            sourceText.value = translatedTextValue;
            translatedText.value = sourceTextValue;
            
            // Mettre à jour le compteur
            charCount.textContent = sourceText.value.length;
        }
    });

    // Soumission du formulaire - traduction manuelle
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        clearTimeout(timeoutId);
        translateText(false);
    });

    // Traduction quand on change de langue
    sourceLanguage.addEventListener('change', function() {
        if (detectedLangDisplay) {
            detectedLangDisplay.style.display = 'none';
        }
        if (sourceText.value.trim().length > 0) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => translateText(true), 500);
        }
    });

    targetLanguage.addEventListener('change', function() {
        if (sourceText.value.trim().length > 0) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => translateText(true), 500);
        }
    });

    // Traduction avec Entrée (Ctrl+Entrée ou Shift+Entrée)
    sourceText.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
            e.preventDefault();
            translateText(false);
        }
    });
});