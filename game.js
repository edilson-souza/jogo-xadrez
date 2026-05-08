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
            #promoModal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6); }
            #promoContent { background-color: #2a2a2a; color: white; margin: 15% auto; padding: 20px; border-radius: 12px; width: 300px; text-align: center; border: 1px solid #444; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
            .promo-options { display: flex; justify-content: space-around; margin-top: 20px; }
            .promo-option { width: 60px; height: 60px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; object-fit: contain; }
            .promo-option:hover { border-color: #27ae60; background-color: #333; border-radius: 8px; transform: scale(1.1); }
            
            /* Classe de destaque para a peça selecionada no tabuleiro */
            .highlight-selected {
                box-shadow: inset 0 0 3px 3px #27ae60 !important;
                background-color: rgba(39, 174, 96, 0.3) !important;
            }
        `;
        document.head.appendChild(style);
    }

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
    constructor(boardId, statusId) {
        this.logic = new Chess();
        this.boardId = boardId;
        this.statusEl = document.getElementById(statusId);
        this.board = null;
        this.sourceSquare = null;
        this.pendingMove = null;

        this.promoter = new PawnPromotion(this, this.executePromotion.bind(this));
        this.init();
    }
    
    init() {
        const settings = {
            draggable: false, // CLIQUE ATIVADO: Arrastar desativado
            position: 'start',
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };

        this.board = Chessboard(this.boardId, settings);
        
        // Evento de clique nas casas
        $(`#${this.boardId}`).on('click', '.square-55d63', (e) => {
            const square = $(e.currentTarget).data('square');
            this.handleSquareClick(square);
        });

        window.addEventListener('resize', () => this.board.resize());
        this.updateStatus();
    }

    // Gerencia a lógica de clique (Origem -> Destino)
    handleSquareClick(square) {
    // Se ainda não selecionou uma origem
    if (this.sourceSquare === null) {
        const piece = this.logic.get(square);
        
        // Verifica se clicou em uma peça da cor da vez
        if (piece && piece.color === this.logic.turn()) {
            this.sourceSquare = square;
            this.highlightSquare(square); // Destaque da peça selecionada
            this.showPossibleMoves(square); // NOVO: Mostra onde pode clicar
        }
    } else {
        // Se já tinha selecionado e clicou em outra (ou na mesma)
        const source = this.sourceSquare;
        const target = square;
        
        this.removeHighlights();
        this.sourceSquare = null;

        if (source === target) return;

        this.handlePreMove(source, target);
    }
}

    showPossibleMoves(square) {
    // Obtém lista de movimentos legais para esta casa específica
    const moves = this.logic.moves({
        square: square,
        verbose: true
    });

    // Se não houver movimentos, não faz nada
    if (moves.length === 0) return;

    // Para cada movimento possível, adiciona uma classe de destaque
    moves.forEach((move) => {
        this.highlightPossibleTarget(move.to);
    });
}

highlightPossibleTarget(square) {
    $(`#${this.boardId} .square-${square}`).addClass('highlight-hint');
}

    // Destaque visual
    highlightSquare(square) {
        $(`#${this.boardId} .square-${square}`).addClass('highlight-selected');
    }

    removeHighlights() {
    $(`#${this.boardId} .square-55d63`).removeClass('highlight-selected highlight-hint');
}

    handlePreMove(source, target) {
        // Validação básica de movimento
        let move = this.logic.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return; // Movimento inválido

        this.logic.undo(); // Desfaz para checar se precisa de modal de promoção

        const fromPiece = this.logic.get(source);
        if (fromPiece.type === 'p' && 
            ((fromPiece.color === 'w' && target[1] === '8') ||
             (fromPiece.color === 'b' && target[1] === '1'))) {
                
            this.pendingMove = { from: source, to: target };
            this.promoter.open();
            return;
        }

        this.executeMove(source, target);
    }

    executePromotion(pieceType) {
        if (this.pendingMove) {
            this.executeMove(this.pendingMove.from, this.pendingMove.to, pieceType);
            this.pendingMove = null;
        }
    }

    executeMove(source, target, promotionType = 'q') {
        this.logic.move({
            from: source,
            to: target,
            promotion: promotionType
        });

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
        this.sourceSquare = null;
        this.removeHighlights();
        this.updateStatus();
    }
}

// Inicialização
const myGame = new ChessGame('boardContainer', 'status');

document.getElementById('resetBtn').addEventListener('click', () => {
    myGame.reset();
});