export class Chat {

    #input = document.getElementById("chatInput");
    #sendBtn = document.getElementById("chatSend");
    #log = document.getElementById("chatLog");
    #peerConnection;

    constructor(peerConnection) {
        this.#peerConnection = peerConnection;
        this.updateUi("NOT_CONNECTED");
        this.#sendBtn.addEventListener("click", () => {
            if (this.#peerConnection.dataChannel === null) return;
            if (this.#input.value.trim() === "") return this.#input.value = "";
            this.#addToLog("local", this.#input.value);
            this.#peerConnection.sendData({ type: "CHAT", text: this.#input.value });
            this.#input.value = "";
        });

        this.#input.addEventListener("keyup", event => {
            if (event.key !== "Enter") return;
            this.#sendBtn.click();
        });
    }

    updateUi(state) {
        if (["NOT_CONNECTED", "CONNECTING", "CONNECTED"].includes(state)) {
            this.#log.innerHTML = "";
        }
        if (state === "NOT_CONNECTED") this.addServerMessage("Click 'Find Opponent' to get matched for a freestyle battle!");
        if (state === "CONNECTING")    this.addServerMessage("🔍 Searching for an opponent...");
        if (state === "CONNECTED")     this.addServerMessage("🎤 Opponent found! Get ready to battle.");
        if (state === "DISCONNECTED_LOCAL")  this.addServerMessage("You left the battle.");
        if (state === "DISCONNECTED_REMOTE") this.addServerMessage("Opponent disconnected.");
    }

    addRemoteMessage = (text) => this.#addToLog("remote", text);
    addServerMessage = (text) => this.#addToLog("server", text);

    #addToLog(owner, message) {
        this.#log.insertAdjacentHTML("beforeend", `<div class="message ${owner}">${message}</div>`);
        this.#log.scrollTop = this.#log.scrollHeight;
    }
}
