/**
 * Classe responsável por criar e gerenciar o modal de seleção de peça de promoção.
 */
class PawnPromotion {
    constructor(game, callback) {
        this.game = game;
        this.callback = callback;
        this.selectedPiece = null;
        this.createStyle();
        this.createModal();
    }

    createStyle() {
        if (document.getElementById('promoStyle')) return;
        const style = document.createElement('style');
        style.id = 'promoStyle';
        style.innerHTML = `
            #promoModal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
            #promoContent { background-color: #2a2a2a; color: white; margin: 15% auto; padding: 20px; border-radius: 12px; width: 300px; text-align: center; border: 1px solid #444; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
            .promo-options { display: flex; justify-content: space-around; margin-top: 20px; }
            .promo-option { width: 50px; height: 50px; cursor: pointer; border: 2px solid transparent; transition: border-color 0.2s; }
            .promo-option:hover { border-color: #27ae60; background-color: #333; border-radius: 8px; }
        `;
        document.head.appendChild(style);
    }

    // No game.js, dentro da classe PawnPromotion:

    createModal() {
            this.modal = document.createElement('div');
            this.modal.id = 'promoModal';
            this.modal.innerHTML = `
        <div id="promoContent">
            <h3>Escolha a peça para promover</h3>
            <div class="promo-options">
                <img class="promo-option" data-piece="q" alt="Rainha">
                <img class="promo-option" data-piece="r" alt="Torre">
                <img class="promo-option" data-piece="b" alt="Bispo">
                <img class="promo-option" data-piece="n" alt="Cavalo">
            </div>
        </div>
    `;
    document.body.appendChild(this.modal);
    this.addEventListeners();
}

    getPieceUrl(type) {
        // Usa as mesmas imagens padrão que o tabuleiro
        return `https://chessboardjs.com/img/chesspieces/wikipedia/${this.game.logic.turn()}${type}.png`;
    }

    addEventListeners() {
        this.modal.querySelectorAll('.promo-option').forEach(option => {
            option.addEventListener('click', (event) => {
                this.selectedPiece = event.target.dataset.piece;
                this.close();
                this.callback(this.selectedPiece);
            });
        });
    }

    open() {
    this.selectedPiece = null;
    
    // Atualiza as imagens para a cor do jogador atual antes de mostrar
    const turn = this.game.logic.turn(); 
    this.modal.querySelectorAll('.promo-option').forEach(img => {
        const piece = img.dataset.piece;
        img.src = `https://chessboardjs.com/img/chesspieces/wikipedia/${turn}${piece.toUpperCase()}.png`;
    });

    this.modal.style.display = 'block';
    }

    close() {
        this.modal.style.display = 'none';
    }
}

/**
 * Classe responsável por gerenciar toda a lógica do jogo
 */
class ChessGame {
    constructor(boardId, statusId, pgnId) {
        this.logic = new Chess();
        this.boardId = boardId;
        this.statusEl = document.getElementById(statusId);
        this.pgnEl = document.getElementById(pgnId);
        this.board = null;

        // --- NOVA LINHA --- Instancia o objeto de promoção ---
        this.promoter = new PawnPromotion(this, this.executePromotion.bind(this));
        // --- NOVA LINHA --- Armazena temporariamente o movimento pendente ---
        this.pendingMove = null;

        this.init();
    }

    init() {
        const settings = {
            draggable: true,
            position: 'start',
            onDragStart: (src, piece) => this.validatePiece(piece),
            // --- LINHA ALTERADA --- Chama a nova lógica de manipulação ---
            onDrop: (src, tgt) => this.handlePreMove(src, tgt),
            onSnapEnd: () => this.syncBoard(),
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };

        this.board = Chessboard(this.boardId, settings);
        this.updateStatus();
    }

    validatePiece(piece) {
        if (this.logic.game_over()) return false;
        
        const turn = this.logic.turn();
        if ((turn === 'w' && piece.search(/^b/) !== -1) ||
            (turn === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }

    // --- NOVO MÉTODO --- Pré-valida o movimento e checa promoção ---
    handlePreMove(source, target) {
        // Tenta fazer o movimento na lógica como um movimento comum primeiro
        let move = this.logic.move({
            from: source,
            to: target,
            promotion: 'q' // Promoção temporária para validar se é possível
        });

        // Se o movimento for ilegal, anula
        if (move === null) return 'snapback';

        // Desfaz o movimento temporário
        this.logic.undo();

        // Checa se o movimento resultaria em uma promoção REAL
        const history = this.logic.history({ verbose: true });
        const lastMove = history[history.length - 1]; // Isso não funciona, chess.js move é estranho

        // --- MANEIRA CORRETA DE CHECAR ---
        const fromPiece = this.logic.get(source);
        if (fromPiece.type === 'p' && 
            ((fromPiece.color === 'w' && target.substring(1) === '8') ||
             (fromPiece.color === 'b' && target.substring(1) === '1'))) {
                
            // Armazena o movimento e abre o modal
            this.pendingMove = { from: source, to: target };
            this.promoter.open();
            return; // Impede que o movimento seja finalizado agora
        }

        // Se não for promoção, executa o movimento comum
        this.executeMove(source, target);
    }

    // --- NOVO MÉTODO --- Executa o movimento de promoção após a escolha ---
    executePromotion(pieceType) {
        if (this.pendingMove) {
            this.executeMove(this.pendingMove.from, this.pendingMove.to, pieceType);
            this.pendingMove = null; // Limpa o movimento pendente
        }
    }

    // --- NOVO MÉTODO COMPARTILHADO --- Executa a lógica de movimento real ---
    executeMove(source, target, promotionType = 'q') {
        const move = this.logic.move({
            from: source,
            to: target,
            promotion: promotionType // 'q' como padrão, ou a peça escolhida
        });

        // Sincroniza o tabuleiro visivelmente após a promoção
        this.syncBoard();
        this.updateStatus();
    }

    syncBoard() {
        this.board.position(this.logic.fen());
    }

    updateStatus() {
        let status = "";
        const player = (this.logic.turn() === 'w') ? "Brancas" : "Pretas";

        if (this.logic.in_checkmate()) {
            status = `FIM DE JOGO: ${player} perderam (Mate).`;
        } else if (this.logic.in_draw()) {
            status = "FIM DE JOGO: Empate.";
        } else {
            status = `Vez das ${player}`;
            if (this.logic.in_check()) status += " (XEQUE!)";
        }

        this.statusEl.innerText = status;
    }

    reset() {
        this.logic.reset();
        this.board.start();
        this.updateStatus();
    }
}

// --- CÓDIGO FORA DA CLASSE PERMANECE O MESMO ---
const myGame = new ChessGame('boardContainer', 'status', 'pgn');

document.getElementById('resetBtn').addEventListener('click', () => {
    myGame.reset();
});