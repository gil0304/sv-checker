// 右クリックメニューを追加
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "highlightSelection",
    title: "Highlight Subjects and Verbs",
    contexts: ["selection"],
  });
});

// 右クリックメニューがクリックされたときに処理を実行
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "highlightSelection" && info.selectionText) {
    // compromise.min.js をページにインジェクトする
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["compromise.min.js"], // ローカルに保存したcompromise.jsをインジェクト
      },
      () => {
        // インジェクト後、テキスト解析を実行
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: analyzeAndHighlightText,
          args: [info.selectionText],
        });
      }
    );
  }
});

// コンテンツスクリプトとして注入する関数
function analyzeAndHighlightText(text) {
  // 文を解析
  let doc = nlp(text);
  let sentences = doc.sentences();

  sentences.forEach((sentence, index) => {
    let parsedSentence = nlp(sentence.text());

    // 英語に特化した主語検出
    // 例: "The origin of our solar system" や "Our solar system's origin"
    let subject = parsedSentence
      .match("#Determiner? #Adjective* #Noun+ of? #Noun*")
      .out("array");

    // 動詞句の検出
    let verbs = parsedSentence.match("#Verb+").out("array");

    // 名詞句（主語）を水色にハイライト
    if (subject.length > 0) {
      subject.forEach((subj) => {
        let regex = new RegExp(`\\b${subj}\\b`, "gi");
        text = text.replace(
          regex,
          `<span style="color: lightblue;">${subj}</span>`
        );
      });
    }

    // 動詞句をオレンジにハイライト
    verbs.forEach((verb) => {
      let regex = new RegExp(`\\b${verb}\\b`, "gi");
      text = text.replace(regex, `<span style="color: orange;">${verb}</span>`);
    });
  });

  // ページに解析結果を反映
  const selection = window.getSelection();
  if (selection.rangeCount === 0) {
    console.error("No valid selection range found.");
    return;
  }

  const range = selection.getRangeAt(0);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = text;

  // 全ての子要素をDocumentFragmentに追加
  const fragment = document.createDocumentFragment();
  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }

  // 現在の選択範囲をクリアして、ハイライトされたテキストを挿入
  range.deleteContents();
  range.insertNode(fragment);
}
