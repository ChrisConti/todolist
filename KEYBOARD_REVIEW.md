# Review du comportement du clavier - CreateTask & UpdateTask

## État actuel du code

### CreateTask.tsx
```tsx
<KeyboardAvoidingView
  behavior="padding"
  keyboardVerticalOffset={90}
>
  <View style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Formulaire */}
    </ScrollView>

    {/* Footer en position absolute */}
    <View style={{ position: 'absolute', bottom: 10 }}>
      <TouchableOpacity onPress={updateBabyTasks}>
        <View style={styles.button}>
          <Text>Valider</Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
</KeyboardAvoidingView>
```

### UpdateTask.tsx
```tsx
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Formulaire */}
    </ScrollView>

    {/* Footer en position absolute */}
    <View style={{ position: 'absolute', bottom: 10 }}>
      <TouchableOpacity onPress={updateBabyTasks}>
        <View style={styles.button}>
          <Text>Valider</Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
</TouchableWithoutFeedback>
```

---

## Problèmes identifiés

### 🔴 Problème #1 : Footer en position absolute avec KeyboardAvoidingView
**Impact:** Critique sur iOS, Majeur sur Android

**Explication:**
- Le footer est en `position: 'absolute'` avec `bottom: 10`
- `KeyboardAvoidingView` ne peut PAS déplacer les éléments en position absolute
- Quand le clavier s'ouvre, le footer reste à 10px du bas de l'écran **physique**
- Résultat : **le clavier cache le bouton de validation**

**Comportement observé:**
- iOS : Le bouton disparaît complètement sous le clavier
- Android : Dépend du `windowSoftInputMode` (peut redimensionner ou chevaucher)

---

### 🔴 Problème #2 : Incohérence entre CreateTask et UpdateTask
**Impact:** Majeur (UX inconsistante)

**Explication:**
- CreateTask utilise `KeyboardAvoidingView` (mais mal configuré)
- UpdateTask n'utilise RIEN pour gérer le clavier
- Deux écrans similaires = deux comportements différents = mauvaise UX

---

### 🟡 Problème #3 : paddingBottom fixe dans ScrollView
**Impact:** Moyen

**Explication:**
- CreateTask : `paddingBottom: 100`
- UpdateTask : `paddingBottom: 120`
- Valeurs arbitraires qui tentent de compenser le footer
- Ne s'adapte pas à la hauteur réelle du clavier ou du footer
- Sur petits écrans : trop d'espace vide
- Sur grands écrans : peut-être insuffisant

---

### 🟡 Problème #4 : keyboardVerticalOffset fixe
**Impact:** Moyen sur iOS

**Explication:**
- Offset fixe de 90px pour iOS et Android
- Ne tient pas compte de la navigation bar dynamique
- Ne s'adapte pas aux différents types de clavier (avec/sans suggestion bar)
- Peut causer un décalage sur iPhone avec Dynamic Island ou notch

---

### 🟢 Problème #5 : Pas d'animation fluide
**Impact:** Mineur (cosmétique mais important pour le feeling)

**Explication:**
- Le footer ne s'anime pas avec le clavier
- Transition brusque au lieu d'un mouvement fluide
- L'utilisateur ne voit pas le bouton "remonter" avec le clavier

---

## Recommandations et solutions

### ✅ Solution recommandée : Architecture hybride avec KeyboardAvoidingView

**Pourquoi cette approche ?**
- Fonctionne nativement sur iOS et Android
- Pas de dépendance externe
- Animation fluide native
- Simple à maintenir

**Architecture:**
```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      paddingBottom: 20  // Juste un petit padding
    }}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={true}
  >
    {/* Formulaire */}
  </ScrollView>

  {/* Footer DANS le flux normal (pas absolute) */}
  <View style={styles.footer}>
    <TouchableOpacity onPress={updateBabyTasks}>
      <View style={styles.button}>
        <Text>Valider</Text>
      </View>
    </TouchableOpacity>
  </View>
</KeyboardAvoidingView>

// Styles
footer: {
  backgroundColor: '#FDF1E7',
  paddingVertical: 10,
  paddingHorizontal: 20,
  paddingBottom: Platform.select({
    ios: 20,
    android: 10,
  }),
  borderTopWidth: 1,
  borderTopColor: 'rgba(199, 91, 74, 0.1)',
  alignItems: 'center',
}
```

**Avantages:**
- ✅ Le footer remonte avec le clavier automatiquement
- ✅ Animation native fluide
- ✅ Fonctionne sur iOS et Android
- ✅ Pas de valeurs magiques (paddingBottom: 100)
- ✅ S'adapte à tous les écrans
- ✅ Le ScrollView peut scroller jusqu'en bas
- ✅ Le bouton est toujours accessible

---

### 🎯 Solution alternative : react-native-keyboard-aware-scroll-view

**Quand l'utiliser ?**
Si vous avez des besoins plus complexes ou des problèmes sur Android

```bash
npm install react-native-keyboard-aware-scroll-view
```

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

<KeyboardAwareScrollView
  enableOnAndroid={true}
  extraScrollHeight={20}
  keyboardShouldPersistTaps="handled"
>
  {/* Formulaire */}

  {/* Footer à la fin du ScrollView (pas absolute) */}
  <View style={styles.footer}>
    <TouchableOpacity onPress={updateBabyTasks}>
      <View style={styles.button}>
        <Text>Valider</Text>
      </View>
    </TouchableOpacity>
  </View>
</KeyboardAwareScrollView>
```

**Avantages:**
- ✅ Gère automatiquement le scroll jusqu'au champ actif
- ✅ Meilleur support Android
- ✅ Moins de configuration manuelle

**Inconvénients:**
- ❌ Dépendance externe (9KB)
- ❌ Une couche d'abstraction supplémentaire

---

### 🛠️ Configuration Android (android/app/src/main/AndroidManifest.xml)

**Important:** Vérifier le windowSoftInputMode

```xml
<activity
  android:name=".MainActivity"
  android:windowSoftInputMode="adjustResize"
  ...>
</activity>
```

**Options:**
- `adjustResize` : L'écran se redimensionne (RECOMMANDÉ pour formulaires)
- `adjustPan` : L'écran se déplace (peut cacher le header)
- `adjustNothing` : Rien ne bouge (mauvais pour formulaires)

---

## Plan d'action recommandé

### Phase 1 : Alignement CreateTask et UpdateTask
1. Adopter la même approche pour les deux écrans
2. Enlever `position: 'absolute'` du footer
3. Mettre le footer dans le flux normal

### Phase 2 : Implémentation KeyboardAvoidingView
1. Wrapper avec `KeyboardAvoidingView`
2. Behavior différencié iOS/Android
3. Footer dans le flux normal
4. Supprimer les paddingBottom arbitraires

### Phase 3 : Test et ajustements
1. Tester sur iPhone (différentes tailles, avec/sans notch)
2. Tester sur Android (différentes tailles d'écran)
3. Tester avec clavier suggérant (iOS)
4. Tester rotation paysage
5. Ajuster les offsets si nécessaire

### Phase 4 (optionnel) : Polissage
1. Ajouter une bordure subtile sur le footer
2. Animation fade-in du footer
3. Gérer le safe area (iPhone X+)

---

## Comparatif des approches

| Critère | Position Absolute (actuel) | Footer dans flux + KAV | KeyboardAwareScrollView |
|---------|---------------------------|------------------------|-------------------------|
| Bouton visible avec clavier | ❌ Non | ✅ Oui | ✅ Oui |
| Animation fluide | ❌ Non | ✅ Oui | ✅ Oui |
| Support iOS | ❌ Buggy | ✅ Excellent | ✅ Excellent |
| Support Android | 🟡 Moyen | ✅ Bon | ✅ Excellent |
| Complexité | 🟢 Simple | 🟢 Simple | 🟡 Moyenne |
| Dépendances | ✅ Aucune | ✅ Aucune | ❌ +1 lib |
| Maintenance | ❌ Fragile | ✅ Robuste | ✅ Robuste |

**Verdict:** Footer dans flux + KeyboardAvoidingView (Solution recommandée)

---

## Exemple de code final recommandé

```tsx
// CreateTask.tsx & UpdateTask.tsx (même structure)
import { KeyboardAvoidingView, Platform } from 'react-native';

const CreateTask = ({ navigation }) => {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={{ flex: 1, backgroundColor: '#FDF1E7' }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 10,
            paddingTop: 10,
            paddingBottom: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Tout le formulaire ici */}

          {/* Image picker */}
          <View style={{ flexDirection: 'row' }}>
            {/* ... */}
          </View>

          {/* Inputs */}
          {handleCategorie(selectedImage)}

          {/* Notes */}
          <TextInput
            style={styles.inputComment}
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
            placeholder={t('placeholder.comment')}
          />
        </ScrollView>

        {/* Footer - DANS LE FLUX, PAS ABSOLUTE */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={updateBabyTasks}
            disabled={loading}
            style={styles.buttonContainer}
          >
            <View style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? (
                <ActivityIndicator color="#F6F0EB" />
              ) : (
                <Text style={styles.buttonText}>
                  {t('button.validate')}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ... autres styles

  footer: {
    backgroundColor: '#FDF1E7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({
      ios: 20,
      android: 10,
    }),
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 91, 74, 0.1)',
    alignItems: 'center',
    // Retirer shadowColor, shadowOffset, etc. si trop subtil
  },

  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },

  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
});
```

---

## Points d'attention spécifiques

### Sur iOS
- Le behavior `padding` fonctionne mieux avec les formulaires
- Attention au keyboardVerticalOffset avec les différentes tailles de navigation bar
- Tester avec le clavier suggestion bar (QuickType)

### Sur Android
- Le behavior `height` est plus prévisible
- Vérifier `android:windowSoftInputMode="adjustResize"` dans AndroidManifest.xml
- Le clavier Android peut avoir des hauteurs très variables

### Safe Area (iPhone X+)
- Utiliser `useSafeAreaInsets()` si nécessaire
- Ajouter paddingBottom dynamique pour le footer

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

<View style={[
  styles.footer,
  { paddingBottom: Math.max(insets.bottom, 10) }
]}>
```

---

## Résumé des changements nécessaires

### À supprimer
- ❌ `position: 'absolute'` sur le footer
- ❌ `paddingBottom: 100` arbitraire dans ScrollView
- ❌ TouchableWithoutFeedback inutile (UpdateTask)

### À ajouter
- ✅ Footer dans le flux normal (après ScrollView)
- ✅ KeyboardAvoidingView avec behavior différencié iOS/Android
- ✅ Bordure subtile sur le footer
- ✅ Safe area support

### À aligner
- ✅ Même structure pour CreateTask et UpdateTask
- ✅ Même comportement clavier
- ✅ Même style de footer

---

## Métriques de succès

Après implémentation, vérifier que :
- [ ] Le bouton reste toujours visible quand le clavier est ouvert
- [ ] L'animation est fluide (pas de saut)
- [ ] Le scroll permet d'atteindre tous les champs
- [ ] Le comportement est identique sur CreateTask et UpdateTask
- [ ] Fonctionne sur iOS 14+ et Android 10+
- [ ] Fonctionne en mode portrait et paysage
- [ ] Pas de zone blanche bizarre
- [ ] Le footer ne chevauche pas le contenu
