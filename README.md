# Form tesztelő Chrome extension

Készítette: Gábor Sándor.

Egy egyszerű Manifest V3 Chrome extension, amely egy kattintással változatos tesztadatokkal tölti ki a jelentkezési űrlapot.

## Telepítés fejlesztői módban

1. Nyisd meg: `chrome://extensions`
2. Kapcsold be a `Developer mode` kapcsolót.
3. Kattints a `Load unpacked` gombra.
4. Válaszd ki ezt a mappát: `form-tester`

## Használat

1. Nyisd meg a tesztelendő jelentkezési űrlapot.
2. Kattints a Chrome eszköztárán a `Form tesztelő` ikonra.
3. Nyomd meg a `Tesztadatok kitöltése` gombot.

A `Kitöltés és küldés` gomb megpróbálja elküldeni az űrlapot is.

## Megjegyzés

A böngészők biztonsági szabályai miatt fájlfeltöltő mezőt extensionből nem lehet automatikusan feltölteni. Ezeket kézzel kell kiválasztani.