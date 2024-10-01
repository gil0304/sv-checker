chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "highlightSelection",
    title: "Highlight Subjects and Verbs",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "highlightSelection" && info.selectionText) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["compromise.min.js"],
      },
      () => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: analyzeAndHighlightText,
          args: [info.selectionText],
        });
      }
    );
  }
});

function analyzeAndHighlightText(text) {
  let doc = nlp(text);
  let sentences = doc.sentences();

  sentences.forEach((sentence, index) => {
    let parsedSentence = nlp(sentence.text());

    let subject = parsedSentence
      .match("#Determiner? #Adjective* #Noun+ of? #Noun*")
      .out("array");

    let verbs = parsedSentence.match("#Verb+").out("array");

    if (subject.length > 0) {
      subject.forEach((subj) => {
        let regex = new RegExp(`\\b${subj}\\b`, "gi");
        text = text.replace(
          regex,
          `<span style="color: lightblue;">${subj}</span>`
        );
      });
    }
    verbs.forEach((verb) => {
      let regex = new RegExp(`\\b${verb}\\b`, "gi");
      text = text.replace(regex, `<span style="color: orange;">${verb}</span>`);
    });
  });

  const selection = window.getSelection();
  if (selection.rangeCount === 0) {
    console.error("No valid selection range found.");
    return;
  }

  const range = selection.getRangeAt(0);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = text;

  const fragment = document.createDocumentFragment();
  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }

  range.deleteContents();
  range.insertNode(fragment);
}
