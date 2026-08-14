import {
  ArrowRight,
  CalendarCheck,
  ChartNoAxesCombined,
  Check,
  Clock3,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
const plans = [
  {
    name: "Essencial",
    price: "79",
    description: "Para começar a organizar a agenda.",
    items: ["Até 3 barbeiros", "300 agendamentos/mês", "Agenda pública"],
  },
  {
    name: "Profissional",
    price: "149",
    featured: true,
    description: "Para barbearias em crescimento.",
    items: [
      "Até 10 barbeiros",
      "2.000 agendamentos/mês",
      "WhatsApp e relatórios",
    ],
  },
  {
    name: "Escala",
    price: "299",
    description: "Para redes e operações maiores.",
    items: ["Até 50 barbeiros", "10.000 agendamentos/mês", "Gestão avançada"],
  },
];
export default function Landing() {
  return (
    <main className="landing">
      <header className="landingNav">
        <a href="/" className="landingBrand">
          <span>
            <Scissors />
          </span>
          <div>
            NAVALHA<small>GESTÃO PARA BARBEARIAS</small>
          </div>
        </a>
        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div>
          <a className="navLogin" href="/login">
            Entrar
          </a>
          <a className="navCta" href="/cadastro">
            Teste grátis
          </a>
        </div>
      </header>
      <section className="hero">
        <div className="heroCopy">
          <p>
            <Sparkles />
            GESTÃO SIMPLES. BARBEARIA FORTE.
          </p>
          <h1>Sua barbearia organizada, do primeiro horário ao fechamento.</h1>
          <span>
            Agenda online, clientes, equipe, financeiro e relacionamento em uma
            plataforma feita para a rotina de quem atende.
          </span>
          <div className="heroActions">
            <a href="/cadastro">
              Começar teste grátis <ArrowRight />
            </a>
            <a href="/login">Já tenho uma conta</a>
          </div>
          <small>
            <Check />
            14 dias para testar <Check />
            Sem cartão agora <Check />
            Configuração rápida
          </small>
        </div>
        <div className="heroVisual">
          <div className="demoTop">
            <i />
            <span>NAVALHA · Visão geral</span>
            <b>Hoje</b>
          </div>
          <div className="demoWelcome">
            <small>PAINEL DA BARBEARIA</small>
            <h2>Boa tarde, Gustavo 👋</h2>
            <p>Você tem 7 atendimentos programados hoje.</p>
          </div>
          <div className="demoMetrics">
            <article>
              <CalendarCheck />
              <span>
                <small>Agendamentos</small>
                <b>07</b>
              </span>
            </article>
            <article>
              <ChartNoAxesCombined />
              <span>
                <small>Faturamento</small>
                <b>R$ 620</b>
              </span>
            </article>
            <article>
              <Clock3 />
              <span>
                <small>Próximo horário</small>
                <b>14:30</b>
              </span>
            </article>
          </div>
          <div className="demoAgenda">
            <p>PRÓXIMOS ATENDIMENTOS</p>
            {[
              "14:30 · Caio Ferreira",
              "15:30 · Bruno Almeida",
              "17:00 · Matheus Carvalho",
            ].map((x, i) => (
              <article key={x}>
                <i>{i + 1}</i>
                <b>{x}</b>
                <span>Confirmado</span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="trustStrip">
        <span>Feito para barbearias independentes, equipes e redes</span>
        <b>Agenda</b>
        <b>Clientes</b>
        <b>Equipe</b>
        <b>Financeiro</b>
        <b>WhatsApp</b>
      </section>
      <section className="landingSection" id="recursos">
        <div className="sectionIntro">
          <p>TUDO EM UM SÓ LUGAR</p>
          <h2>
            Menos tarefas manuais.
            <br />
            Mais tempo para atender.
          </h2>
          <span>
            Uma operação completa e conectada, sem planilhas espalhadas.
          </span>
        </div>
        <div className="featureGrid">
          <Feature
            icon={<CalendarCheck />}
            title="Agenda inteligente"
            text="Horários, disponibilidade, bloqueios e agendamento online sem conflitos."
          />
          <Feature
            icon={<Users />}
            title="Clientes e equipe"
            text="Histórico de clientes, acessos individuais, barbeiros e comissões."
          />
          <Feature
            icon={<ChartNoAxesCombined />}
            title="Financeiro real"
            text="Pagamentos, receita, fechamento e relatórios para decisões melhores."
          />
          <Feature
            icon={<MessageCircle />}
            title="Relacionamento"
            text="Confirmações e lembretes preparados para integração com WhatsApp."
          />
          <Feature
            icon={<ShieldCheck />}
            title="Seguro e profissional"
            text="Dados separados por empresa, permissões e auditoria das operações."
          />
          <Feature
            icon={<Scissors />}
            title="Feito para o setor"
            text="Serviços, duração, profissionais e rotina pensados para barbearias."
          />
        </div>
      </section>
      <section className="howSection">
        <div>
          <p>COMECE EM MINUTOS</p>
          <h2>Do cadastro ao primeiro agendamento.</h2>
        </div>
        <div>
          {[
            ["01", "Crie sua barbearia"],
            ["02", "Cadastre equipe e serviços"],
            ["03", "Compartilhe sua agenda online"],
          ].map((x) => (
            <article key={x[0]}>
              <b>{x[0]}</b>
              <h3>{x[1]}</h3>
              <span>
                Uma configuração guiada e direta para colocar sua operação em
                movimento.
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="landingSection plansSection" id="planos">
        <div className="sectionIntro centered">
          <p>PLANOS PARA CADA MOMENTO</p>
          <h2>Comece pequeno. Cresça sem trocar de sistema.</h2>
        </div>
        <div className="landingPlans">
          {plans.map((p) => (
            <article key={p.name} className={p.featured ? "featured" : ""}>
              {p.featured && <em>MAIS ESCOLHIDO</em>}
              <small>PLANO</small>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <strong>
                <sup>R$</sup>
                {p.price}
                <i>/mês</i>
              </strong>
              {p.items.map((x) => (
                <span key={x}>
                  <Check />
                  {x}
                </span>
              ))}
              <a href="/cadastro">Testar grátis</a>
            </article>
          ))}
        </div>
      </section>
      <section className="faqSection" id="duvidas">
        <div>
          <p>DÚVIDAS FREQUENTES</p>
          <h2>Pronto para organizar sua barbearia?</h2>
          <a href="/cadastro">
            Criar minha conta <ArrowRight />
          </a>
        </div>
        <div>
          <details open>
            <summary>Preciso instalar algum programa?</summary>
            <p>
              Não. O Navalha funciona online no computador, tablet ou celular.
            </p>
          </details>
          <details>
            <summary>Meus clientes conseguem agendar sozinhos?</summary>
            <p>
              Sim. Cada empresa possui uma página pública exclusiva para
              agendamento.
            </p>
          </details>
          <details>
            <summary>Posso cadastrar minha equipe?</summary>
            <p>
              Sim. Cada profissional pode ter acesso próprio, agenda e comissão.
            </p>
          </details>
          <details>
            <summary>Consigo mudar de plano depois?</summary>
            <p>
              Sim. A troca pode ser solicitada diretamente na área de
              assinatura.
            </p>
          </details>
        </div>
      </section>
      <footer className="landingFooter">
        <a href="/" className="landingBrand">
          <span>
            <Scissors />
          </span>
          <div>
            NAVALHA<small>GESTÃO PARA BARBEARIAS</small>
          </div>
        </a>
        <p>Agenda, gestão e crescimento para barbearias.</p>
        <nav>
          <a href="/login">Entrar na empresa</a>
          <a href="/cadastro">Criar conta</a>
          <a href="/login-plataforma">Portal SaaS</a>
        </nav>
        <small>
          © {new Date().getFullYear()} Navalha. Todos os direitos reservados.
        </small>
      </footer>
    </main>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
