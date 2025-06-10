from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import requests
import json
from .models import Translation

@login_required
def home(request):
    """Vue principale de l'application de traduction"""
    recent_translations = Translation.objects.filter(user=request.user)[:5] if hasattr(Translation, 'user') else Translation.objects.all()[:5]
    
    # Langues supportées
    languages = {
        'en': 'Anglais',
        'fr': 'Français',
        'es': 'Espagnol',
        'de': 'Allemand',
        'it': 'Italien',
        'pt': 'Portugais',
        'ru': 'Russe',
        'ja': 'Japonais',
        'ko': 'Coréen',
        'zh': 'Chinois',
        'ar': 'Arabe',
        'nl': 'Néerlandais',
        'pl': 'Polonais',
        'tr': 'Turc',
        'sv': 'Suédois',
        'da': 'Danois',
        'no': 'Norvégien',
        'fi': 'Finnois',
        'cs': 'Tchèque',
        'hu': 'Hongrois',
    }
    
    context = {
        'languages': languages,
        'recent_translations': recent_translations,
        'user': request.user
    }
    return render(request, 'translator/home.html', context)

@csrf_exempt
@login_required
def translate_text(request):
    """API endpoint pour traduire le texte"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            text = data.get('text', '').strip()
            source_lang = data.get('source_lang')
            target_lang = data.get('target_lang')
            
            if not text:
                return JsonResponse({'error': 'Le texte ne peut pas être vide'}, status=400)
            
            if not source_lang or not target_lang:
                return JsonResponse({'error': 'Veuillez sélectionner les langues source et cible'}, status=400)
            
            # Si la langue source est la même que la langue cible
            if source_lang == target_lang:
                return JsonResponse({
                    'translated_text': text,
                    'source_lang': source_lang,
                    'target_lang': target_lang,
                    'success': True,
                    'message': 'Les langues source et cible sont identiques'
                })
            
            # Utiliser l'API MyMemory pour la traduction
            url = "https://api.mymemory.translated.net/get"
            params = {
                'q': text,
                'langpair': f"{source_lang}|{target_lang}",
                'mt': '1'
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('responseStatus') == 200:
                    translated_text = result['responseData']['translatedText']
                    
                    # Vérifier si la traduction semble valide
                    if translated_text and translated_text.strip():
                        # Sauvegarder dans la base de données
                        translation = Translation.objects.create(
                            source_text=text,
                            translated_text=translated_text,
                            source_language=source_lang,
                            target_language=target_lang
                        )
                        
                        return JsonResponse({
                            'translated_text': translated_text,
                            'source_lang': source_lang,
                            'target_lang': target_lang,
                            'success': True
                        })
                    else:
                        return JsonResponse({'error': 'La traduction est vide ou invalide'}, status=500)
                else:
                    error_message = result.get('responseDetails', 'Erreur de traduction inconnue')
                    return JsonResponse({'error': f'Erreur de traduction: {error_message}'}, status=500)
            else:
                return JsonResponse({'error': 'Service de traduction indisponible'}, status=500)
                
        except requests.exceptions.Timeout:
            return JsonResponse({'error': 'Délai d\'attente dépassé. Veuillez réessayer.'}, status=500)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': f'Erreur de connexion: {str(e)}'}, status=500)
        except Exception as e:
            return JsonResponse({'error': f'Erreur inattendue: {str(e)}'}, status=500)
    
    return JsonResponse({'error': 'Méthode non autorisée'}, status=405)

@login_required
def history(request):
    """Vue pour afficher l'historique des traductions"""
    translations = Translation.objects.all()[:20]
    return render(request, 'translator/history.html', {'translations': translations})
