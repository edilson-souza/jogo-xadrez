class ChessGame {
    constructor(boardId, statusId) {
        this.logic = new Chess();
        this.boardId = boardId;
        this.statusEl = document.getElementById(statusId);
        this.sourceSquare = null;
        
        const urlParams = new URLSearchParams(window.location.search);
        // Se entrou por link, é PRETAS, senão aguarda escolha de modo
        this.playerColor = urlParams.has('room') ? 'b' : 'w';

        this.promoter = new PawnPromotion(this, this.executePromotion.bind(this));
        this.network = new ChessNetwork(this);
        
        this.init();
    }
    
    init() {
        const settings = {
            draggable: false, // Usaremos clique, não drag
            position: 'start',
            orientation: this.playerColor === 'b' ? 'black' : 'white',
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };

        this.board = Chessboard(this.boardId, settings);
        
        // CORREÇÃO: Seletor de clique nas casas do chessboard.js
        $(document).on('click', '.square-55d63', (e) => {
            const square = $(e.currentTarget).data('square');
            this.handleSquareClick(square);
        });

        window.addEventListener('resize', () => this.board.resize());
        this.updateStatus();
    }

    handleSquareClick(square) {
        // Se for 1x1 Local (both), permite qualquer cor. Se for online, só a sua cor.
        if (this.playerColor !== 'both' && this.logic.turn() !== this.playerColor) return;

        if (this.sourceSquare === null) {
            const piece = this.logic.get(square);
            if (piece && piece.color === this.logic.turn()) {
                this.sourceSquare = square;
                this.highlightSquare(square);
                this.showPossibleMoves(square);
            }
        } else {
            const from = this.sourceSquare;
            this.sourceSquare = null;
            this.removeHighlights();
            
            this.executeMove(from, square);
        }
    }

    executeMove(source, target, promotion = 'q', shouldPublish = true) {
        const move = this.logic.move({ from: source, to: target, promotion: promotion });

        if (move) {
            if (shouldPublish && this.playerColor !== 'both') {
                this.network.sendMove({ from: source, to: target, promotion: promotion, color: this.playerColor });
            }
            this.board.position(this.logic.fen());
            this.updateStatus();
        }
    }

    // ... (restante das funções de highlight e status do seu arquivo anterior)
    highlightSquare(s) { $(`.square-${s}`).addClass('highlight-selected'); }
    removeHighlights() { $('.square-55d63').removeClass('highlight-selected highlight-hint'); }
    showPossibleMoves(square) {
        const moves = this.logic.moves({ square: square, verbose: true });
        moves.forEach(m => $(`.square-${m.to}`).addClass('highlight-hint'));
    }
    updateStatus() {
        const turn = this.logic.turn() === 'w' ? "Brancas" : "Pretas";
        this.statusEl.innerText = `Vez das ${turn}`;
    }
    executePromotion(piece) { /* logica de promoção */ }
}

const myGame = new ChessGame('boardContainer', 'status');

// Eventos dos Botões
document.getElementById('btnLocal').onclick = () => {
    myGame.playerColor = 'both';
    alert("Modo Local Ativado! Jogue com as duas cores.");
};

document.getElementById('btnOnline').onclick = () => {
    document.getElementById('multiplayerDetails').style.display = 'block';
    document.getElementById('shareUrl').value = window.location.href;
};

function copyLink() {
    const input = document.getElementById('shareUrl');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert("Link copiado!");
}