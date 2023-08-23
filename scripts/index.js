const baseUrl = "http://localhost:8080"

const Modal = {
    open() {
        document
            .querySelector(".modal-overlay")
            .classList
            .add("active")
    },
    close() {
        document
            .querySelector(".modal-overlay")
            .classList
            .remove("active")
    },

}

const CardColor = {
    positive() {
        document
            .querySelector(".card.total")
            .classList
            .remove("negative")
        document
            .querySelector(".card.total")
            .classList
            .add("positive")
    },
    negative() {
        document
            .querySelector(".card.total")
            .classList
            .remove("positive")
        document
            .querySelector(".card.total")
            .classList
            .add("negative")
    }
}

const Storage = {
    get() {
        return JSON.parse(localStorage.getItem("dev.finances:transactions")) || []
    },

    set(transactions) {
        localStorage.setItem("dev.finances:transactions", JSON.stringify(transactions))
    },

    setTransactions(transactions) {
        localStorage.setItem('allTransactions', JSON.stringify(transactions));
    }
}

const AddTransaction = {
    all: Storage.get(),
    add(transaction) {
        AddTransaction.all.push(transaction);
        var json = JSON.stringify(transaction)
        const requestOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: json
        };
          
        fetch(baseUrl + "/salvarTransacao", requestOptions)
            .then(response => response.json())
            .then(data => {
                if (data.mensagem.includes("excedido")) {
                    Utils.showCustomAlert(data.mensagem, 'warning')
                }
                Storage.set(AddTransaction.all);
                DOM.addTransaction(transaction, AddTransaction.all.length - 1);
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
        });

        App.reload()
    },
    remove(identificador, index) {
        try {
            fetch(baseUrl + "/excluirTransacao" + "/" + identificador, {
                method: 'DELETE'
            })
            .then(res => {
                AddTransaction.all.splice(index, 1)
                App.reload()
            })
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
        

        App.reload()
    },
    incomes() { // Somar tipoTransacaos
        let income = 0

        AddTransaction.all.forEach(transaction => {
            if (transaction.valor > 0) {
                income += transaction.valor
            }
        })
        return income
    },
    expenses() { // Somar saídas
        let expense = 0

        AddTransaction.all.forEach(transaction => {
            if (transaction.valor < 0) {
                expense += transaction.valor
            }
        })
        return expense
    },
    total() { // tipoTransacaos menos saídas
        return AddTransaction.incomes() + AddTransaction.expenses()
    }
}

const Categoria = {
    async loadCategorias() {
        try {
            const response = await fetch(baseUrl + "/listarCategorias");
            const data = await response.json();
            var selectSidebar = document.querySelector("#categoriaSidebar");
            var selectModal = document.querySelector("#categoriaModal");
            var option = document.createElement("option");
            option.text = "Selecione";
            option.value = "";
            selectSidebar.appendChild(option)
            data.data.forEach(function(categoria) {
                const optionSidebar = document.createElement("option");
                const optionModal = document.createElement("option");

                optionSidebar.value = categoria.nome;
                optionModal.value = categoria.nome;
                
                optionSidebar.text = categoria.nome;
                optionModal.text = categoria.nome;

                selectSidebar.appendChild(optionSidebar);
                selectModal.appendChild(optionModal);
            });
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    },

}

const DOM = {
    transactionsContainer: document.querySelector("#data-table tbody"),
    addTransaction(transactions, index) {
        const tr = document.createElement("tr")
        tr.innerHTML = DOM.innerHTMLTransaction(transactions, index)

        DOM.transactionsContainer.appendChild(tr)
    },

    innerHTMLTransaction(transactions) {
        var valor
        if (transactions.tipoTransacao == 'Saida') {
            transactions.valor = transactions.valor * -1
        }
        const CSSclass = transactions.valor > 0 ? "income":"expense"
        if (CSSclass == "income") {
            valor = Utils.formatCurrency(transactions.valor, "entrada")
        } else {
            valor = Utils.formatCurrency(transactions.valor, "saida")
        }
        
        const dia = transactions.data.substring(8, 10);
        const mes = transactions.data.substring(5, 7);
        const ano = transactions.data.substring(0, 4);

        const dataFormatada = `${dia}/${mes}/${ano}`;
        const html = `
        <td class="categoria">${transactions.categoria}</td>
        <td class="descricao">${transactions.descricao}</td>
        <td class="${CSSclass}">${valor}</td>
        <td class="data">${dataFormatada}</td>
        <td>
            <img onclick="AddTransaction.remove(${transactions.identificador}, ${transactions.index})" src="./assets/minus.svg" class="remove" alt="Remover Transação">
        </td>
        `
        return html
    },

    updateBalance() {   
        var totEntrada = 0;
        var totSaida = 0;
        var transactions = JSON.parse(localStorage.getItem('allTransactions'));
        for (var i = 0; i < transactions.length; i++) {
            if (transactions[i].tipoTransacao == 'Entrada') {
                totEntrada += transactions[i].valor
            }
            if (transactions[i].tipoTransacao == 'Saida') {
                totSaida += transactions[i].valor
            }
        }
        const tot = totEntrada - totSaida;
        if (tot < 0) {
            CardColor.negative()
            document.querySelector("#totalDisplay").innerHTML = Utils.formatCurrency(tot, "saida");
        } else {
            CardColor.positive()
            document.querySelector("#totalDisplay").innerHTML = Utils.formatCurrency(tot, "entrada");
        }
        document.querySelector("#incomeDisplay").innerHTML = Utils.formatCurrency(totEntrada, "entrada");
        document.querySelector("#expenseDisplay").innerHTML = Utils.formatCurrency(totSaida, "saida");
        document.querySelector("#totalDisplay").innerHTML = Utils.formatCurrency(tot);
    },

    clearTransactions(){
        localStorage.setItem('allTransactions', null);
        DOM.transactionsContainer.innerHTML = ""
    }
}

const Utils = {
    formatCurrency(value, tipoTransacao) {
        var signal
        if (tipoTransacao == "entrada") {
            signal = "+&nbsp;"
        } else {
            signal = ""
        }
        value = Number(value)
        value = value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        })

        return signal + value
    },
    formatvalor(value) {
        value = value * 100
        return Math.round(value)
    },
    formatSimple(value){
        const signal = Number(value) < 0 ? "- " : "+ "
        value = String(value).replace(/\D/g, "")
        value = Number(value)
        value = value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        })

        return signal + value
    },
    showCustomAlert(mensagem, iconType) {
        Swal.fire({
          title: mensagem,
          icon: iconType,
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Ok'
        });
    }
}

const Form = {
    categoria: document.querySelector("select#categoriaModal"),
    descricao: document.querySelector("input#descricaoModal"),
    valor: document.querySelector("input#valorModal"),
    tipoTransacao: document.querySelector("input#tipoTransacaoModal"),
    data: document.querySelector("input#dataModal"),
    
    getValues() {
        return {
            categoria: Form.categoria.value,
            descricao: Form.descricao.value,
            valor: Form.valor.value,
            tipoTransacao: Form.tipoTransacao.checked,
            data: Form.data.value,
        };
    },

    validateFields() {
        const { categoria, valor, data } = Form.getValues();
        if (valor.trim() === "" || data.trim() === "" || categoria.trim() === "") {
            throw new Error("Por favor, preencha todos os campos!");
        }
    },

    formatValues() {
        let { categoria, descricao, valor, tipoTransacao, data} = Form.getValues();

        if (tipoTransacao){
            tipoTransacao = 'Entrada'
        } else {
            tipoTransacao = 'Saida'
        }

        return {
            categoria,
            descricao,
            valor,
            tipoTransacao,
            data,
        };
    },

    saveTransaction(transaction) {
        AddTransaction.add(transaction)
    },

    clearFields() {
        Form.categoria.value = null;
        Form.descricao.value = "";
        Form.valor.value = "";
        Form.tipoTransacao.checked = false;
        Form.data.value = "";
    },

    submit(event) {
        event.preventDefault();
        try {
            Form.validateFields(); 
            const transaction = Form.formatValues(); 
            Form.saveTransaction(transaction); 
            Form.clearFields(); 

            Modal.close(); 
        } catch (error) {
            console.warn(error.message);
            toastError(error.message);
        }
    },
};

const Filtro = {
    categoria: document.querySelector("select#categoriaSidebar"),
    descricao: document.querySelector("input#descricaoSidebar"),
    valor: document.querySelector("input#valorSidebar"),
    tipoTransacao: document.querySelector("select#tipoTransacaoSidebar"),
    dataInicial: document.querySelector("input#dataInicialSidebar"),
    dataFinal: document.querySelector("input#dataFinalSidebar"),
    
    getValues() {
        return {
            categoria: Filtro.categoria.value,
            descricao: Filtro.descricao.value,
            valor: Filtro.valor.value,
            tipoTransacao: Filtro.tipoTransacao.value,
            dataInicial: Filtro.dataInicial.value,
            dataFinal: Filtro.dataFinal.value,
        };
    },

    formatValues() {
        let { categoria, descricao, valor, tipoTransacao, dataInicial, dataFinal} = Filtro.getValues();

        return {
            categoria,
            descricao,
            valor,
            tipoTransacao,
            dataInicial,
            dataFinal,
        };
    },

    async filtrar(filtro) {
        const endpoint = baseUrl + "/listarTransacoesPorFiltro";
        const queryParams = new URLSearchParams(filtro);
        console.log(filtro)
        console.log(queryParams)
        try {
            const response = await fetch(`${endpoint}?${queryParams}`);   
            const data = await response.json();
            DOM.clearTransactions();
            
            Storage.setTransactions(data.data)
            DOM.updateBalance()
            data.data.forEach((transaction, index) => {
                DOM.addTransaction(transaction, index);
            });
        } catch (error) {
            console.error("Erro na requisição:", error);
        }
    },

    submit(event) {
        event.preventDefault()
        try {
            const filtro = Filtro.formatValues();
            console.log(filtro)
            Filtro.filtrar(filtro); 
        } catch (error) {
            console.warn(error.message);
            toastError(error.message);
        }
    },

}

const Sidebar = {
    w3_open() {
        var main = document.querySelector("#main");
        var sidebar = document.querySelector("#mySidebar");
        var nav = document.querySelector("#openNav");
        main.style.marginLeft = "25%";
        sidebar.style.width = "25%";
        sidebar.style.display = "block";
        nav.style.display = 'none';
    },

    w3_close() {
        document.querySelector("#main").style.marginLeft = "0%";
        document.querySelector("#mySidebar").style.display = "none";
        document.querySelector("#openNav").style.display = "inline-block";
    }
}

const App = {
    categorias: [],

    async init() {
        await App.fetchTransactions();
        await Categoria.loadCategorias()
        DOM.updateBalance();
    },

    async fetchTransactions() {
        try {
            const response = await fetch(baseUrl + "/listarTransacoesPorFiltro");
            const data = await response.json();
            DOM.clearTransactions();

            Storage.setTransactions(data.data)
            DOM.updateBalance()
            data.data.forEach((transaction, index) => {
                DOM.addTransaction(transaction, index);
            });
        } catch (error) {
            console.error("Erro ao buscar as transações:", error);
        }
    },

    reload() {
        DOM.clearTransactions();
        App.init();
    }
};

App.init()

function toastError(message = "ERRO!") {
    /*let a = document.querySelector("???").innerHTML = `
    <div id="toast">
    <div class="img">Icon</div>
    <div class="descricao">${message}</div>
    </div>`*/

    const toastId = document.querySelector("#toast")
    toastId.className = "show"

    setTimeout(() => {
        toastId.className = toastId.className.replace("show", "")
    }, 5000)
}