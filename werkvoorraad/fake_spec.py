import json
import pprint
import random
import re
from string import ascii_uppercase

import werkvoorraad


excerpt = """
    Het was in eenen tsinxen daghe
    Dat beede bosch ende haghe
    Met groenen loveren waren bevaen.
    Nobel, die coninc, hadde ghedaen
    Sijn hof crayeren over al
    Dat hi waende, hadde hijs gheval,
    Houden ten wel groeten love.
    Doe quamen tes sconinx hove
    Alle die diere, groet ende cleene,
    Sonder vos Reynaert alleene.
    Hi hadde te hove so vele mesdaen
    Dat hire niet dorste gaen.
    Die hem besculdich kent, ontsiet!
    Also was Reynaerde ghesciet
    Ende hier omme scuwedi sconinx hof
    Daer hi in hadde crancken lof.
    Doe al dat hof versamet was,
    Was daer niemen, sonder die das,
    Hine hadde te claghene over Reynaerde,
    Den fellen metten grijsen baerde.
    Nu gaet hier up eene claghe.
    Isingrijn ende sine maghe
    Ghinghen voer den coninc staen
    Ysengrijn begonste saen
    Ende sprac: 'Coninc, heere,
    Dor hu edelheit ende dor hu eere
    Ende dor recht ende dor ghenade,
    Ontfaerme hu miere scade
    Die mi Reynaert heeft ghedaen,
    Daer ic af dicken hebbe ontfaen
    Groeten lachter ende verlies.
    Voer al dandre ontfaerme hu dies
    Dat hi mijn wijf hevet verhoert
    Ende mine kindre so mesvoert
    Dat hise beseekede daer si laghen,
    Datter twee noint ne saghen
    Ende si worden staer blent.
    Nochtan hoendi mi sent:
    Het was sint so verre comen
    Datter eenen dach af was ghenomen
    Ende Reynaerd soude hebben ghedaen
    Sine onsculde. Ende also saen
    Alse die heleghe waren brocht,
    Was hi ander sins bedocht
    Ende ontfoer ons in sine veste.
    Heere, dit kennen noch die beste
    Die te hove zijn commen hier.
    Mi hevet Reynaert, dat felle dier,
    So vele te leede ghedaen,
    Ic weet wel al sonder waen,
    Al ware al tlaken paerkement
    Datmen maket nu te Ghent,
    In ne ghescreeft niet daer an.
    Dies zwijghics nochtan,
    Ne ware mijns wives lachter
    Ne mach niet bliven achter,
    No onversweghen no onghewroken!'
    Doe Ysengrijn dit hadde ghesproken,
    Stont up een hondekijn, hiet Cortoys,
    Ende claghede den coninc in Francsoys
    Hoet so arem was wijlen eere,
    Dat alles goets en hadde meere
    In eenen winter, in eene vorst,
    Dan alleene eene worst
    hem Reynaert, die felle man,
    Die selve worst stal ende nam.
    Tybeert die cater die wart gram;
    Aldus hi sine tale began
    Ende spranc midden in den rinc
    Ende seide: 'Heere coninc,
    Dor dat ghi Reynaerde zijt onhout,
    So en es hier jonc no hout,
    Hine hebbe te wroughene jeghen hu.
    Dat Cortoys claghet nu,
    Dats over menich jaer ghesciet.
    Die worst was mine, al en claghic niet.
    Ic hadse bi miere lust ghewonnen
    Daer ic bi nachte quam gheronnen
    Omme bejach in eene molen,
    Daer ic die worst in hadde ghestolen
    Eenen slapenden molen man.
    Hadder Cortoys yewet an,
    Dan was bi niemene dan bi mi.
    Hets recht dat omberecht zi
    Die claghe die Cortoys doet.'
    Pancer de bever sprac: 'Dinct hu goet,
    Tybeert, datmen die claghe ombeere?
    Reynaert es een recht mordeneere
    Ende een trekere ende een dief.
    Hine heeft oec niemene so lief,
    No den coninc, minen heere,
    Hine wilde dat hi lijf ende eere
    Verlore, mochtire an winnen
    Een vet morzeel van eere hinnen.
    Wat sechdi van eere laghe?
    En dedi ghistren in den daghe
    Eene die meeste overdaet
    An Cuwaerde den hase die hier staet,
    Die noyt eenich dier ghedede?
    Want hi hem binnen sconinx vrede
    Ende binnen des coninx gheleede
    Ghelovede te leerne sinen crede
    Ende soudene maken capelaen.
    Doe dedine sitten gaen
    Vaste tusschen sine beene.
    Doe begonsten si over eene
    Spellen ende lesen beede
    Ende lude te zinghene crede.
"""

regex = re.compile(r"\w+")
tokens = regex.findall(excerpt)

NUMS = '0123456789'
LETTERS = ascii_uppercase
REYNAERDE = [i.strip(":;., ") for i in excerpt.split('\n') if i]
TOKENS = [i.lower() for i in tokens if len(i) > 4]


fake_str = lambda pop, k: ''.join(random.choices(pop, k=k))


def fetch_random_item_from_list_generator(lst):
    lst_copy = lst.copy()
    while lst_copy:
        random_index = random.randrange(len(lst_copy))
        yield lst_copy.pop(random_index)

fake_label = fetch_random_item_from_list_generator(REYNAERDE)


def fake_data(
    *args,
    max_length: int = 30,
    skip_chance: float = 0.3,
    **kwargs,
) -> dict[list]:
    randomizers = {
        'id_1': lambda: fake_str(LETTERS, 5),
        'id_2': lambda: fake_str(NUMS, 7),
        'id_3': lambda: fake_str(LETTERS, 1) + fake_str(NUMS, 6),
    }

    id_names = ['id_1', 'id_2', 'id_3']
    weights = [0.6, 0.3, 0.1]
    k = random.choices([1, 2, 3], weights=weights)[0]
    items = random.sample(id_names, k=k)

    lengths = list(range(max_length))
    results = {}
    skip = random.random() < skip_chance

    for id_name in items:
        n = 0 if skip else random.choice(lengths)
        results[id_name] = [randomizers[id_name]() for i in range(n)]
        return results


def fake_query_name():
    k = random.randint(1, 3)
    items = random.sample(TOKENS, k=k)
    stem = '_'.join(items)
    return f"{stem}.sql"


def fake_query():
    ops = ['=', '!=', '<', '>', '<=', '>=']
    randomizers = [
        lambda: f"{random.choice(ops)} {random.randint(1, 1000)}",
        lambda: f"{random.choice(ops)} {random.random()}",
        lambda: f"= '{fake_str(LETTERS, random.randint(5, 9))}'",
        lambda: f"is {random.choice(['not ', ''])}null",
    ]
    colname = random.choice(TOKENS)
    return f"{colname} {random.choice(randomizers)()}"


def fake_item():
    return {
        "label": random.choice(REYNAERDE),
        "instructie": random.choice(REYNAERDE),
        "data": {
            "query": fake_query_name(),
            "where": [fake_query() for _ in range(random.randint(0, 5))]
        }
    }


def fake_container(depth):
    if depth == 0:
        return fake_item()
    else:
        n_items = random.randint(1, 5)
        return {
            "id": fake_str(LETTERS, 12),
            "label": random.choice(REYNAERDE),
            "items": [fake_container(depth - 1) for _ in range(n_items)]
        }


if __name__ == '__main__':
    print("""
-----------------------------------------------------------------------
    CREATE WERKVOORRAAD FROM FAKE SPEC
-----------------------------------------------------------------------
""")

    fake_spec = [fake_container(random.randint(1, 3)) for _ in range(4)]
    as_json = json.dumps(fake_spec, indent=4)
    json_file = (werkvoorraad.PATH / 'demo_specificatie.json')
    json_file.write_text(as_json)
    pprint.pprint(fake_spec)

    def sql_getter(*args, **kwargs):
        return "select * from x"

    transformers = {
        'query': werkvoorraad.as_query_link,
        'where': werkvoorraad.wrap_criteria_in_blockquotes,
    }

    werkvoorraad.make_werkvoorraad(
        data_getter = fake_data,
        sql_getter = sql_getter,
        spec = fake_spec,
        outpath = werkvoorraad.PATH / 'index.html',
        transformers = transformers,
    )

    print('\n', '-' * 72)
